import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisClientService } from '@database/redis-client.service';
import { User } from '@modules/auth/schemas/user.schema';
import { UserActivity } from '../schemas/user-activity.schema';
import { LeaderboardEntry } from '../schemas/leaderboard-entry.schema';
import {
  LeaderboardPeriod,
  LeaderboardType,
  ActivityType,
} from '../enums/gamification.enums';

@Injectable()
export class LeaderboardService {
  private static readonly LEADERBOARD_TTL = 7 * 24 * 60 * 60;

  private static readonly EVENT_TYPE_GROUPS: Record<
    LeaderboardType,
    ActivityType[]
  > = {
    [LeaderboardType.Academic]: [
      ActivityType.LessonCompleted,
      ActivityType.SectionCompleted,
      ActivityType.CourseCompleted,
      ActivityType.AssignmentSubmitted,
      ActivityType.AssignmentApproved,
      ActivityType.HighGrade,
      ActivityType.DailyLearningActivity,
      ActivityType.LearningStreak,
      ActivityType.CourseProgressBonus,
    ],
    [LeaderboardType.Competitive]: [
      ActivityType.ContestJoined,
      ActivityType.ContestTop25,
      ActivityType.ContestTop10,
      ActivityType.ContestRatingGain,
    ],
    [LeaderboardType.Community]: [
      ActivityType.QuestionCreated,
      ActivityType.AnswerCreated,
      ActivityType.AcceptedAnswer,
      ActivityType.QuestionUpvoteReceived,
      ActivityType.AnswerUpvoteReceived,
      ActivityType.ThreadCreated,
      ActivityType.BadgeAwarded,
    ],
  };

  private static readonly SCORING_LEGEND: {
    eventType: string;
    label: string;
    points: string;
  }[] = [
    {
      eventType: 'problem_solved',
      label: 'Problem solved',
      points: '10 / 20 / 35 / 50',
    },
    { eventType: 'contest_joined', label: 'Contest joined', points: '15' },
    { eventType: 'contest_top_25', label: 'Contest top 25%', points: '25' },
    { eventType: 'contest_top_10', label: 'Contest top 10%', points: '50' },
    {
      eventType: 'contest_rating_gain',
      label: 'Contest rating gain',
      points: '1pt per +10 rating, cap 30',
    },
    { eventType: 'question_created', label: 'Question created', points: '5' },
    { eventType: 'answer_created', label: 'Answer created', points: '15' },
    { eventType: 'accepted_answer', label: 'Accepted answer', points: '25' },
    {
      eventType: 'question_upvote_received',
      label: 'Question upvotes received',
      points: '2 (daily cap 20)',
    },
    {
      eventType: 'answer_upvote_received',
      label: 'Answer upvotes received',
      points: '3 (daily cap 30)',
    },
    { eventType: 'thread_created', label: 'Thread created', points: '5' },
    { eventType: 'badge_awarded', label: 'Badge awarded', points: '15' },
    { eventType: 'lesson_completed', label: 'Lesson completed', points: '2' },
    { eventType: 'section_completed', label: 'Section completed', points: '5' },
    { eventType: 'course_completed', label: 'Course completed', points: '100' },
    {
      eventType: 'assignment_submitted',
      label: 'Assignment submitted',
      points: '10',
    },
    {
      eventType: 'assignment_approved',
      label: 'Assignment approved',
      points: '20',
    },
    { eventType: 'high_grade', label: 'High grade bonus', points: '15' },
    {
      eventType: 'daily_learning_activity',
      label: 'Daily learning activity',
      points: '3',
    },
    { eventType: 'learning_streak', label: 'Learning streak', points: '25' },
    {
      eventType: 'course_progress_bonus',
      label: 'Course progress bonus',
      points: 'progress% * 0.5',
    },
  ];

  constructor(
    @InjectModel(UserActivity.name) private activityModel: Model<UserActivity>,
    @InjectModel(LeaderboardEntry.name)
    private leaderboardEntryModel: Model<LeaderboardEntry>,
    @InjectModel(User.name) private userModel: Model<User>,
    private redis: RedisClientService,
  ) {}

  private leaderboardKey(type: LeaderboardType): string {
    return `leaderboard:${type}`;
  }

  async rebuildLeaderboard(type: LeaderboardType): Promise<number> {
    const eventTypes = LeaderboardService.EVENT_TYPE_GROUPS[type];
    const key = this.leaderboardKey(type);

    const activities = await this.activityModel
      .find({ activityType: { $in: eventTypes } })
      .sort({ userId: 1, occurredAt: -1 })
      .lean();

    const scoreMap = new Map<string, number>();
    for (const activity of activities) {
      const uid = activity.userId.toString();
      scoreMap.set(uid, (scoreMap.get(uid) || 0) + activity.points);
    }

    const multi = this.redis.client.multi();
    multi.del(key);
    for (const [userId, score] of scoreMap) {
      multi.zadd(key, score, userId);
    }
    multi.expire(key, LeaderboardService.LEADERBOARD_TTL);
    await multi.exec();

    return scoreMap.size;
  }

  async getTopUsers(
    type: LeaderboardType,
    limit: number,
    excludeOptedOut: boolean,
  ): Promise<{ rank: number; userId: string; score: number }[]> {
    const key = this.leaderboardKey(type);
    const results = await this.redis.client.zrevrange(
      key,
      0,
      limit - 1,
      'WITHSCORES',
    );

    if (!results || results.length === 0) {
      await this.rebuildLeaderboard(type);
      const refreshed = await this.redis.client.zrevrange(
        key,
        0,
        limit - 1,
        'WITHSCORES',
      );
      if (!refreshed || refreshed.length === 0) return [];
      return this.formatRedisResults(refreshed, excludeOptedOut);
    }

    return this.formatRedisResults(results, excludeOptedOut);
  }

  private async formatRedisResults(
    results: string[],
    excludeOptedOut: boolean,
  ): Promise<{ rank: number; userId: string; score: number }[]> {
    const entries: { userId: string; score: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({ userId: results[i], score: parseFloat(results[i + 1]) });
    }

    if (excludeOptedOut) {
      const userIds = entries.map((e) => new Types.ObjectId(e.userId));
      const optedOutUsers = await this.userModel
        .find({
          _id: { $in: userIds },
          'privacySettings.showOnLeaderboard': false,
        })
        .select('_id')
        .lean();
      const optedOutSet = new Set(optedOutUsers.map((u) => u._id.toString()));
      const filtered = entries.filter((e) => !optedOutSet.has(e.userId));
      return filtered.map((e, idx) => ({
        rank: idx + 1,
        userId: e.userId,
        score: e.score,
      }));
    }

    return entries.map((e, idx) => ({
      rank: idx + 1,
      userId: e.userId,
      score: e.score,
    }));
  }

  async getUserRank(
    type: LeaderboardType,
    userId: string,
  ): Promise<{ rank: number | null; score: number }> {
    const key = this.leaderboardKey(type);
    const [rank, score] = await Promise.all([
      this.redis.client.zrevrank(key, userId),
      this.redis.client.zscore(key, userId),
    ]);

    if (rank === null || score === null) {
      const exists = await this.activityModel.exists({
        userId: new Types.ObjectId(userId),
        activityType: { $in: LeaderboardService.EVENT_TYPE_GROUPS[type] },
      });
      if (exists) {
        await this.rebuildLeaderboard(type);
        const [newRank, newScore] = await Promise.all([
          this.redis.client.zrevrank(key, userId),
          this.redis.client.zscore(key, userId),
        ]);
        return {
          rank: newRank !== null ? newRank + 1 : null,
          score: newScore !== null ? parseFloat(newScore) : 0,
        };
      }
    }

    return {
      rank: rank !== null ? rank + 1 : null,
      score: score !== null ? parseFloat(score) : 0,
    };
  }

  async persistSnapshot(
    type: LeaderboardType,
    period: LeaderboardPeriod,
  ): Promise<number> {
    const key = this.leaderboardKey(type);
    const entries = await this.redis.client.zrevrange(key, 0, -1, 'WITHSCORES');

    if (!entries || entries.length === 0) return 0;

    const now = new Date();
    const windowStart = this.getWindowStart(period, now);
    const windowEnd = this.getWindowEnd(period, now);

    const docs: any[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      docs.push({
        period,
        windowStart,
        windowEnd,
        scopeType: 'global',
        scopeId: null,
        userId: new Types.ObjectId(entries[i]),
        score: parseFloat(entries[i + 1]),
        rank: i / 2 + 1,
        scoreChange: 0,
        activeDays: 0,
        breakdown: {},
        reputation: {
          total: 0,
          breakdown: { problem: 0, community: 0, contest: 0, course: 0 },
        },
        generatedAt: now,
      });
    }

    if (docs.length > 0) {
      await this.leaderboardEntryModel.insertMany(docs, { ordered: false });
    }

    return docs.length;
  }

  private getWindowStart(period: LeaderboardPeriod, date: Date): Date {
    if (period === LeaderboardPeriod.AllTime) return new Date(0);
    if (period === LeaderboardPeriod.Monthly) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.getFullYear(), date.getMonth(), diff);
  }

  private getWindowEnd(period: LeaderboardPeriod, date: Date): Date {
    if (period === LeaderboardPeriod.AllTime) return new Date('2100-01-01');
    if (period === LeaderboardPeriod.Monthly) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }
    const start = this.getWindowStart(period, date);
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  getScoringLegend() {
    return LeaderboardService.SCORING_LEGEND;
  }
}

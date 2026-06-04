import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '@modules/auth/schemas/user.schema';
import { UserActivity } from '../schemas/user-activity.schema';
import { ActivityType } from '../enums/gamification.enums';

const EVENT_TYPE_GROUPS = {
  problem: new Set<string>([ActivityType.ProblemSolved]),
  community: new Set<string>([
    ActivityType.QuestionCreated,
    ActivityType.AnswerCreated,
    ActivityType.AcceptedAnswer,
    ActivityType.QuestionUpvoteReceived,
    ActivityType.AnswerUpvoteReceived,
    ActivityType.ThreadCreated,
    ActivityType.BadgeAwarded,
  ]),
  contest: new Set<string>([
    ActivityType.ContestJoined,
    ActivityType.ContestTop25,
    ActivityType.ContestTop10,
    ActivityType.ContestRatingGain,
  ]),
  course: new Set<string>([
    ActivityType.LessonCompleted,
    ActivityType.SectionCompleted,
    ActivityType.CourseCompleted,
    ActivityType.AssignmentSubmitted,
    ActivityType.AssignmentApproved,
    ActivityType.HighGrade,
    ActivityType.DailyLearningActivity,
    ActivityType.LearningStreak,
    ActivityType.CourseProgressBonus,
  ]),
};

interface ScoreBreakdown {
  problemScore: number;
  communityScore: number;
  contestScore: number;
  courseScore: number;
  totalScore: number;
}

@Injectable()
export class ReputationService {
  constructor(
    @InjectModel(UserActivity.name) private activityModel: Model<UserActivity>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async calculateScoreBreakdown(userId: string): Promise<ScoreBreakdown> {
    const pipeline = [
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          problemScore: {
            $sum: {
              $cond: [
                { $in: ['$activityType', [...EVENT_TYPE_GROUPS.problem]] },
                '$points',
                0,
              ],
            },
          },
          communityScore: {
            $sum: {
              $cond: [
                { $in: ['$activityType', [...EVENT_TYPE_GROUPS.community]] },
                '$points',
                0,
              ],
            },
          },
          contestScore: {
            $sum: {
              $cond: [
                { $in: ['$activityType', [...EVENT_TYPE_GROUPS.contest]] },
                '$points',
                0,
              ],
            },
          },
          courseScore: {
            $sum: {
              $cond: [
                { $in: ['$activityType', [...EVENT_TYPE_GROUPS.course]] },
                '$points',
                0,
              ],
            },
          },
        },
      },
    ];

    const results: Array<{
      problemScore: number;
      communityScore: number;
      contestScore: number;
      courseScore: number;
    }> = await this.activityModel.aggregate(pipeline);
    const totals = results[0] ?? {
      problemScore: 0,
      communityScore: 0,
      contestScore: 0,
      courseScore: 0,
    };

    const totalScore =
      Number(totals.problemScore || 0) +
      Number(totals.communityScore || 0) +
      Number(totals.contestScore || 0) +
      Number(totals.courseScore || 0);

    return {
      problemScore: Math.round(Number(totals.problemScore || 0) * 100) / 100,
      communityScore:
        Math.round(Number(totals.communityScore || 0) * 100) / 100,
      contestScore: Math.round(Number(totals.contestScore || 0) * 100) / 100,
      courseScore: Math.round(Number(totals.courseScore || 0) * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100,
    };
  }

  async syncReputationScore(userId: string): Promise<ScoreBreakdown> {
    const breakdown = await this.calculateScoreBreakdown(userId);
    const reputation = {
      total: breakdown.totalScore,
      breakdown: {
        problem: breakdown.problemScore,
        community: breakdown.communityScore,
        contest: breakdown.contestScore,
        course: breakdown.courseScore,
      },
    };

    await this.userModel.findByIdAndUpdate(userId, {
      reputationScore: breakdown.totalScore,
      reputation,
    });

    return breakdown;
  }

  async getReputationBreakdown(userId: string): Promise<{
    total: number;
    breakdown: {
      problem: number;
      community: number;
      contest: number;
      course: number;
    };
  }> {
    const user = await this.userModel
      .findById(userId)
      .select('reputation reputationScore')
      .lean();

    const repField = user?.reputation as
      | {
          total?: number;
          breakdown?: {
            problem?: number;
            community?: number;
            contest?: number;
            course?: number;
          };
        }
      | undefined;
    if (repField && typeof repField.total === 'number' && repField.breakdown) {
      return {
        total: repField.total,
        breakdown: {
          problem: repField.breakdown.problem ?? 0,
          community: repField.breakdown.community ?? 0,
          contest: repField.breakdown.contest ?? 0,
          course: repField.breakdown.course ?? 0,
        },
      };
    }

    const breakdown = await this.syncReputationScore(userId);
    return {
      total: breakdown.totalScore,
      breakdown: {
        problem: breakdown.problemScore,
        community: breakdown.communityScore,
        contest: breakdown.contestScore,
        course: breakdown.courseScore,
      },
    };
  }
}

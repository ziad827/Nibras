import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserActivity } from '../schemas/user-activity.schema';
import { ReputationService } from './reputation.service';
import { BadgeEvaluationService } from './badge-evaluation.service';
import {
  EVENT_POINTS,
  PROBLEM_POINTS_BY_DIFFICULTY,
  VOTE_DAILY_CAPS,
  CONTEST_RATING_GAIN,
  HIGH_GRADE_THRESHOLD,
  COURSE_PROGRESS_BONUS_MULTIPLIER,
} from '../constants/scoring.constants';
import { ActivityType, ActivitySource } from '../enums/gamification.enums';

interface AwardOptions {
  userId: string;
  activityType: ActivityType;
  source: ActivitySource;
  resourceId?: string;
  resourceType?: string;
  points?: number;
  metadata?: Record<string, unknown>;
  dedupeKey: string;
  occurredAt?: Date;
  courseId?: string;
  skipBadgeCheck?: boolean;
}

@Injectable()
export class PointsEngineService {
  private readonly logger = new Logger(PointsEngineService.name);

  constructor(
    @InjectModel(UserActivity.name) private activityModel: Model<UserActivity>,
    private reputationService: ReputationService,
    @Inject(forwardRef(() => BadgeEvaluationService))
    private badgeEvaluationService: BadgeEvaluationService,
  ) {}

  static getPointsForActivity(
    activityType: ActivityType,
    metadata?: Record<string, unknown>,
  ): number {
    switch (activityType) {
      case ActivityType.ProblemSolved: {
        const rawDifficulty = metadata?.difficulty;
        const difficulty =
          typeof rawDifficulty === 'string' ? rawDifficulty.toLowerCase() : '';
        return (
          (PROBLEM_POINTS_BY_DIFFICULTY as Record<string, number>)[
            difficulty
          ] || 0
        );
      }
      case ActivityType.ContestRatingGain: {
        const ratingChange = Math.max(Number(metadata?.ratingChange || 0), 0);
        return Math.min(
          Math.floor(ratingChange / 10) * CONTEST_RATING_GAIN.pointsPer10Rating,
          CONTEST_RATING_GAIN.maxPoints,
        );
      }
      case ActivityType.HighGrade: {
        const grade = Number(metadata?.grade || 0);
        return grade > HIGH_GRADE_THRESHOLD ? EVENT_POINTS.high_grade : 0;
      }
      case ActivityType.CourseProgressBonus: {
        const newProgress = Math.max(
          0,
          Math.min(100, Number(metadata?.progressPercentage || 0)),
        );
        const previous = Math.max(
          0,
          Math.min(100, Number(metadata?.previousProgress || 0)),
        );
        const delta = Math.max(newProgress - previous, 0);
        return Math.round(delta * COURSE_PROGRESS_BONUS_MULTIPLIER * 100) / 100;
      }
      default:
        return (EVENT_POINTS as Record<string, number>)[activityType] || 0;
    }
  }

  async award(options: AwardOptions): Promise<{
    points: number;
    activity: UserActivity | null;
    newBadges: any[];
  }> {
    const points =
      options.points ??
      PointsEngineService.getPointsForActivity(
        options.activityType,
        options.metadata,
      );
    if (points <= 0) {
      return { points: 0, activity: null, newBadges: [] };
    }

    try {
      const activity = await this.activityModel.create({
        userId: new Types.ObjectId(options.userId),
        activityType: options.activityType,
        source: options.source,
        resourceId: options.resourceId
          ? new Types.ObjectId(options.resourceId)
          : undefined,
        resourceType: options.resourceType,
        points,
        metadata: options.metadata || {},
        dedupeKey: options.dedupeKey,
        occurredAt: options.occurredAt || new Date(),
        courseId: options.courseId
          ? new Types.ObjectId(options.courseId)
          : null,
      });

      await this.reputationService.syncReputationScore(options.userId);

      let newBadges: any[] = [];
      if (!options.skipBadgeCheck) {
        newBadges = await this.badgeEvaluationService.checkAndAward(
          options.userId,
          options.activityType,
        );
      }

      return { points, activity, newBadges };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as Record<string, unknown>).code === 11000
      ) {
        return { points: 0, activity: null, newBadges: [] };
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to award points: ${err.message}`, err.stack);
      throw err;
    }
  }

  async awardFromVote(options: {
    userId: string;
    voterId: string;
    targetType: string;
    targetId: string;
    questionId?: string;
    answerId?: string;
    courseId?: string;
    occurredAt?: Date;
  }): Promise<{
    points: number;
    activity: UserActivity | null;
    newBadges: any[];
  }> {
    const activityType =
      options.targetType === 'answer'
        ? ActivityType.AnswerUpvoteReceived
        : ActivityType.QuestionUpvoteReceived;

    const dailyCap =
      activityType === ActivityType.AnswerUpvoteReceived
        ? VOTE_DAILY_CAPS.answer_upvote_received
        : VOTE_DAILY_CAPS.question_upvote_received;

    const basePoints = PointsEngineService.getPointsForActivity(activityType);

    const dayKey = new Date().toISOString().slice(0, 10);
    const dailyDedupePrefix = `${activityType}:${options.userId}:${dayKey}`;

    const todayCount = await this.activityModel.countDocuments({
      userId: new Types.ObjectId(options.userId),
      activityType,
      dedupeKey: { $regex: `^${dailyDedupePrefix}` },
    });

    const allowedPoints = Math.max(0, dailyCap - todayCount * basePoints);
    if (allowedPoints <= 0) {
      return { points: 0, activity: null, newBadges: [] };
    }

    const actualPoints = Math.min(basePoints, allowedPoints);

    return this.award({
      userId: options.userId,
      activityType,
      source: ActivitySource.Community,
      resourceId: options.targetId,
      resourceType: options.targetType === 'answer' ? 'Answer' : 'Question',
      points: actualPoints,
      dedupeKey: `${activityType}:${options.targetType}:${options.targetId}:${options.voterId}`,
      occurredAt: options.occurredAt,
      courseId: options.courseId,
      metadata: {
        voteTargetType: options.targetType,
        voteTargetId: options.targetId,
        voterId: options.voterId,
      },
    });
  }
}

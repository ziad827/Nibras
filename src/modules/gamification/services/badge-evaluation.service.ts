import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '@modules/auth/schemas/user.schema';
import { Badge } from '../schemas/badge.schema';
import { UserBadge } from '../schemas/user-badge.schema';
import { UserActivity } from '../schemas/user-activity.schema';
import { PointsEngineService } from './points-engine.service';
import {
  ActivityType,
  ActivitySource,
  BadgeType,
  BadgeLevel,
} from '../enums/gamification.enums';
import { EVENT_POINTS } from '../constants/scoring.constants';

interface BadgeCriteria {
  minProblemSolved?: number;
  minAcceptedAnswers?: number;
  minReputation?: number;
  minStreakDays?: number;
  hasAnyActivity?: boolean;
}

@Injectable()
export class BadgeEvaluationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BadgeEvaluationService.name);

  private static readonly CORE_BADGES = [
    {
      name: 'First Steps',
      description: 'Complete your first activity on the platform',
      type: BadgeType.Academic,
      criteria: { hasAnyActivity: true },
      pointsValue: EVENT_POINTS.badge_awarded,
      level: BadgeLevel.Bronze,
    },
    {
      name: 'Problem Solver',
      description: 'Solve 10 coding problems',
      type: BadgeType.Competitive,
      criteria: { minProblemSolved: 10 },
      pointsValue: EVENT_POINTS.badge_awarded,
      level: BadgeLevel.Silver,
    },
    {
      name: '7-Day Streak',
      description: 'Maintain a 7-day learning streak',
      type: BadgeType.Academic,
      criteria: { minStreakDays: 7 },
      pointsValue: EVENT_POINTS.badge_awarded,
      level: BadgeLevel.Bronze,
    },
    {
      name: 'Team Player',
      description: 'Help 5 classmates by having your answers accepted',
      type: BadgeType.Community,
      criteria: { minAcceptedAnswers: 5 },
      pointsValue: EVENT_POINTS.badge_awarded,
      level: BadgeLevel.Silver,
    },
    {
      name: 'Top Contributor',
      description: 'Get 10 answers accepted or reach 100 reputation',
      type: BadgeType.Community,
      criteria: { minAcceptedAnswers: 10, minReputation: 100 },
      pointsValue: EVENT_POINTS.badge_awarded,
      level: BadgeLevel.Gold,
    },
  ];

  constructor(
    @InjectModel(Badge.name) private badgeModel: Model<Badge>,
    @InjectModel(UserBadge.name) private userBadgeModel: Model<UserBadge>,
    @InjectModel(UserActivity.name) private activityModel: Model<UserActivity>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => PointsEngineService))
    private pointsEngineService: PointsEngineService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedCoreBadges();
  }

  private async seedCoreBadges(): Promise<void> {
    for (const badgeData of BadgeEvaluationService.CORE_BADGES) {
      const existing = await this.badgeModel
        .findOne({ name: badgeData.name })
        .lean();
      if (!existing) {
        await this.badgeModel.create(badgeData);
        this.logger.log(`Seeded badge: ${badgeData.name}`);
      }
    }
  }

  async checkAndAward(
    userId: string,
    _activityType: ActivityType,
  ): Promise<Badge[]> {
    void _activityType;
    const allBadges = await this.badgeModel.find().lean();
    const earnedBadgeIds = await this.userBadgeModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('badgeId')
      .lean();
    const earnedSet = new Set(
      earnedBadgeIds.map((ub) => ub.badgeId.toString()),
    );

    const newBadges: Badge[] = [];

    for (const badge of allBadges) {
      if (earnedSet.has(badge._id.toString())) continue;

      const criteria = badge.criteria as BadgeCriteria;
      const met = await this.evaluateCriteria(userId, criteria);

      if (met) {
        await this.userBadgeModel.create({
          userId: new Types.ObjectId(userId),
          badgeId: badge._id,
          earnedAt: new Date(),
        });

        await this.pointsEngineService.award({
          userId,
          activityType: ActivityType.BadgeAwarded,
          source: ActivitySource.Gamification,
          resourceId: badge._id.toString(),
          resourceType: 'Badge',
          dedupeKey: `badge_awarded:${userId}:${String(badge._id)}`,
          skipBadgeCheck: true,
        });

        newBadges.push(badge);
      }
    }

    return newBadges;
  }

  private async evaluateCriteria(
    userId: string,
    criteria: BadgeCriteria,
  ): Promise<boolean> {
    if (criteria.hasAnyActivity) {
      const count = await this.activityModel.countDocuments({
        userId: new Types.ObjectId(userId),
      });
      if (count > 0) return true;
    }

    if (criteria.minProblemSolved) {
      const count = await this.activityModel.countDocuments({
        userId: new Types.ObjectId(userId),
        activityType: ActivityType.ProblemSolved,
      });
      if (count < criteria.minProblemSolved) return false;
    }

    if (criteria.minAcceptedAnswers) {
      const count = await this.activityModel.countDocuments({
        userId: new Types.ObjectId(userId),
        activityType: ActivityType.AcceptedAnswer,
      });
      if (count < criteria.minAcceptedAnswers) return false;
    }

    if (criteria.minReputation) {
      const user = await this.userModel
        .findById(userId)
        .select('reputationScore')
        .lean();
      if (!user || (user.reputationScore ?? 0) < criteria.minReputation)
        return false;
    }

    if (criteria.minStreakDays) {
      const count = await this.activityModel.countDocuments({
        userId: new Types.ObjectId(userId),
        activityType: ActivityType.LearningStreak,
        'metadata.streakDays': { $gte: 7 },
      });
      if (count < 1) return false;
    }

    return true;
  }

  async getAllBadgesWithProgress(userId: string): Promise<any[]> {
    const allBadges = await this.badgeModel
      .find()
      .sort({ pointsValue: -1, name: 1 })
      .lean();
    const earnedBadgeIds = await this.userBadgeModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('badgeId earnedAt')
      .lean();
    const earnedMap = new Map(
      earnedBadgeIds.map((ub) => [ub.badgeId.toString(), ub.earnedAt]),
    );

    return allBadges.map((badge) => ({
      _id: badge._id,
      name: badge.name,
      description: badge.description,
      type: badge.type,
      icon: badge.icon,
      pointsValue: badge.pointsValue,
      level: badge.level,
      earned: earnedMap.has(badge._id.toString()),
      earnedAt: earnedMap.get(badge._id.toString()) || null,
    }));
  }

  async getAllBadges(): Promise<Badge[]> {
    return this.badgeModel.find().sort({ pointsValue: -1, name: 1 }).lean();
  }
}

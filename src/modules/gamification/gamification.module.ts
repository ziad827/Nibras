import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@modules/auth/auth.module';
import { User, UserSchema } from '@modules/auth/schemas/user.schema';
import {
  UserActivity,
  UserActivitySchema,
} from './schemas/user-activity.schema';
import { Badge, BadgeSchema } from './schemas/badge.schema';
import { UserBadge, UserBadgeSchema } from './schemas/user-badge.schema';
import {
  LeaderboardEntry,
  LeaderboardEntrySchema,
} from './schemas/leaderboard-entry.schema';
import { ActivityEventService } from './services/activity-event.service';
import { PointsEngineService } from './services/points-engine.service';
import { ReputationService } from './services/reputation.service';
import { BadgeEvaluationService } from './services/badge-evaluation.service';
import { LeaderboardService } from './services/leaderboard.service';
import { GamificationController } from './controllers/gamification.controller';
import { AdminGamificationController } from './controllers/admin-gamification.controller';
import { LeaderboardWeeklyJob } from './jobs/leaderboard-weekly.job';
import { LeaderboardMonthlyJob } from './jobs/leaderboard-monthly.job';
import { LeaderboardArchivalJob } from './jobs/leaderboard-archival.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    MongooseModule.forFeature([
      { name: UserActivity.name, schema: UserActivitySchema },
      { name: Badge.name, schema: BadgeSchema },
      { name: UserBadge.name, schema: UserBadgeSchema },
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GamificationController, AdminGamificationController],
  providers: [
    ActivityEventService,
    PointsEngineService,
    ReputationService,
    BadgeEvaluationService,
    LeaderboardService,
    LeaderboardWeeklyJob,
    LeaderboardMonthlyJob,
    LeaderboardArchivalJob,
  ],
  exports: [
    ActivityEventService,
    PointsEngineService,
    ReputationService,
    BadgeEvaluationService,
    LeaderboardService,
  ],
})
export class GamificationModule {}

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@modules/auth/auth.module';
import { AssessmentsModule } from '@modules/assessments/assessments.module';
import { GamificationModule } from '@modules/gamification/gamification.module';
import { User, UserSchema } from '@modules/auth/schemas/user.schema';
import {
  CachedRanking,
  CachedRankingSchema,
  CompSyncLog,
  CompSyncLogSchema,
  Contest,
  ContestBookmark,
  ContestBookmarkSchema,
  ContestReminder,
  ContestReminderSchema,
  ContestSchema,
  ContestTeam,
  ContestTeamSchema,
  LinkedAccount,
  LinkedAccountSchema,
  Problem,
  ProblemBookmark,
  ProblemBookmarkSchema,
  ProblemSchema,
  Submission,
  SubmissionSchema,
  UserContestParticipation,
  UserContestParticipationSchema,
  UserProblemProgress,
  UserProblemProgressSchema,
  UserRating,
  UserRatingSchema,
} from './schemas';
import { ContestsController } from './controllers/contests.controller';
import { ContestActionsController } from './controllers/contest-actions.controller';
import { ContestsService } from './services/contests.service';
import { LinkedAccountsService } from './services/linked-accounts.service';
import { StandingsService } from './services/standings.service';
import { SubmissionsService } from './services/submissions.service';
import { JudgeService } from './services/judge.service';
import { RatingsService } from './services/ratings.service';
import { PostContestService } from './services/post-contest.service';
import { TeamsService } from './services/teams.service';
import { ContestsGateway } from './gateways/contests.gateway';
import { OptionalSessionGuard } from '@common/guards/optional-session.guard';

@Module({
  imports: [
    forwardRef(() => GamificationModule),
    AssessmentsModule,
    ScheduleModule.forRoot(),
    AuthModule,
    MongooseModule.forFeature([
      { name: Contest.name, schema: ContestSchema },
      { name: Problem.name, schema: ProblemSchema },
      { name: LinkedAccount.name, schema: LinkedAccountSchema },
      {
        name: UserContestParticipation.name,
        schema: UserContestParticipationSchema,
      },
      { name: CachedRanking.name, schema: CachedRankingSchema },
      { name: UserProblemProgress.name, schema: UserProblemProgressSchema },
      { name: ContestBookmark.name, schema: ContestBookmarkSchema },
      { name: ContestReminder.name, schema: ContestReminderSchema },
      { name: ProblemBookmark.name, schema: ProblemBookmarkSchema },
      { name: CompSyncLog.name, schema: CompSyncLogSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: ContestTeam.name, schema: ContestTeamSchema },
      { name: UserRating.name, schema: UserRatingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ContestsController, ContestActionsController],
  providers: [
    ContestsService,
    LinkedAccountsService,
    StandingsService,
    SubmissionsService,
    JudgeService,
    RatingsService,
    PostContestService,
    TeamsService,
    ContestsGateway,
    OptionalSessionGuard,
  ],
  exports: [RatingsService, StandingsService],
})
export class CompetitionsModule {}

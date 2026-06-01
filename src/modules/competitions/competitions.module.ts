import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@modules/auth/auth.module';
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
import { ProblemsController } from './controllers/problems.controller';
import { RankingController } from './controllers/ranking.controller';
import { IntegrationsController } from './controllers/integrations.controller';
import { PracticeController } from './controllers/practice.controller';
import { ContestsService } from './services/contests.service';
import { ProblemsService } from './services/problems.service';
import { RankingService } from './services/ranking.service';
import { LinkedAccountsService } from './services/linked-accounts.service';
import { ReputationService } from './services/reputation.service';
import { StandingsService } from './services/standings.service';
import { SubmissionsService } from './services/submissions.service';
import { JudgeService } from './services/judge.service';
import { RatingsService } from './services/ratings.service';
import { PostContestService } from './services/post-contest.service';
import { TeamsService } from './services/teams.service';
import { ContestSyncJob } from './jobs/contest-sync.job';
import { ProblemSyncJob } from './jobs/problem-sync.job';
import { AccountStatsSyncJob } from './jobs/account-stats-sync.job';
import { ContestReminderJob } from './jobs/contest-reminder.job';
import { CompetitionsSchedulerService } from './jobs/competitions-scheduler.service';
import { ContestsGateway } from './gateways/contests.gateway';
import { CodeforcesPracticeService } from './practice/codeforces-practice.service';
import { LeetcodePracticeService } from './practice/leetcode-practice.service';
import { OptionalSessionGuard } from '@common/guards/optional-session.guard';

@Module({
  imports: [
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
  controllers: [
    ContestsController,
    ContestActionsController,
    ProblemsController,
    RankingController,
    IntegrationsController,
    PracticeController,
  ],
  providers: [
    ContestsService,
    ProblemsService,
    RankingService,
    LinkedAccountsService,
    ReputationService,
    StandingsService,
    SubmissionsService,
    JudgeService,
    RatingsService,
    PostContestService,
    TeamsService,
    ContestSyncJob,
    ProblemSyncJob,
    AccountStatsSyncJob,
    ContestReminderJob,
    CompetitionsSchedulerService,
    ContestsGateway,
    CodeforcesPracticeService,
    LeetcodePracticeService,
    OptionalSessionGuard,
  ],
  exports: [RatingsService, LinkedAccountsService, StandingsService],
})
export class CompetitionsModule {}

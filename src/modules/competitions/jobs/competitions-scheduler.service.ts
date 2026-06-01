import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { CompetitionsConfig } from '@config/configuration';
import { ContestSyncJob } from './contest-sync.job';
import { ProblemSyncJob } from './problem-sync.job';
import { AccountStatsSyncJob } from './account-stats-sync.job';
import { ContestReminderJob } from './contest-reminder.job';
import { RankingService } from '../services/ranking.service';
import { RatingsService } from '../services/ratings.service';

@Injectable()
export class CompetitionsSchedulerService {
  private readonly logger = new Logger(CompetitionsSchedulerService.name);
  private readonly cfg: CompetitionsConfig;

  constructor(
    config: ConfigService,
    private readonly contestSync: ContestSyncJob,
    private readonly problemSync: ProblemSyncJob,
    private readonly accountStatsSync: AccountStatsSyncJob,
    private readonly contestReminder: ContestReminderJob,
    private readonly rankingService: RankingService,
    private readonly ratingsService: RatingsService,
  ) {
    this.cfg = config.getOrThrow<CompetitionsConfig>('competitions');
  }

  private enabled(): boolean {
    return this.cfg.syncEnabled;
  }

  @Cron(process.env.CONTEST_SYNC_CRON ?? '*/15 * * * *')
  async handleContestSync(): Promise<void> {
    if (!this.enabled()) return;
    await this.contestSync.run();
  }

  @Cron(process.env.PROBLEM_SYNC_CRON ?? '0 */6 * * *')
  async handleProblemSync(): Promise<void> {
    if (!this.enabled()) return;
    await this.problemSync.run();
  }

  @Cron(process.env.ACCOUNT_STATS_SYNC_CRON ?? '0 */6 * * *')
  async handleAccountStatsSync(): Promise<void> {
    if (!this.enabled()) return;
    await this.accountStatsSync.run();
  }

  @Cron(process.env.RANKING_CALC_CRON ?? '*/30 * * * *')
  async handleRankingCalc(): Promise<void> {
    if (!this.enabled()) return;
    await this.rankingService.rebuildRankings();
    this.logger.log('Ranking calc completed');
  }

  @Cron(process.env.CONTEST_REMINDER_CRON ?? '* * * * *')
  async handleContestReminder(): Promise<void> {
    if (!this.enabled()) return;
    await this.contestReminder.run();
  }

  @Cron(process.env.POST_CONTEST_CRON ?? '*/10 * * * *')
  async handlePostContest(): Promise<void> {
    if (!this.enabled()) return;
    await this.ratingsService.finalizeEndedContests();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardService } from '../services/leaderboard.service';
import {
  LeaderboardType,
  LeaderboardPeriod,
} from '../enums/gamification.enums';

@Injectable()
export class LeaderboardMonthlyJob {
  private readonly logger = new Logger(LeaderboardMonthlyJob.name);

  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlySnapshot(): Promise<void> {
    this.logger.log('Starting monthly leaderboard snapshot...');

    const types = [
      LeaderboardType.Academic,
      LeaderboardType.Competitive,
      LeaderboardType.Community,
    ];
    for (const type of types) {
      try {
        const count = await this.leaderboardService.persistSnapshot(
          type,
          LeaderboardPeriod.Monthly,
        );
        this.logger.log(
          `Snapshot ${type} leaderboard: ${count} entries persisted`,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Failed to snapshot ${type} leaderboard: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log('Monthly leaderboard snapshot completed');
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeaderboardService } from '../services/leaderboard.service';
import {
  LeaderboardType,
  LeaderboardPeriod,
} from '../enums/gamification.enums';

@Injectable()
export class LeaderboardArchivalJob {
  private readonly logger = new Logger(LeaderboardArchivalJob.name);

  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Cron('0 2 1 * *')
  async handleMonthlyArchival(): Promise<void> {
    this.logger.log('Starting leaderboard archival...');

    const types = [
      LeaderboardType.Academic,
      LeaderboardType.Competitive,
      LeaderboardType.Community,
    ];
    for (const type of types) {
      try {
        const count = await this.leaderboardService.persistSnapshot(
          type,
          LeaderboardPeriod.AllTime,
        );
        this.logger.log(`Archived ${type} leaderboard: ${count} entries`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Failed to archive ${type} leaderboard: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log('Leaderboard archival completed');
  }
}

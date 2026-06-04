import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardService } from '../services/leaderboard.service';
import { LeaderboardType } from '../enums/gamification.enums';

@Injectable()
export class LeaderboardWeeklyJob {
  private readonly logger = new Logger(LeaderboardWeeklyJob.name);

  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyRecalculation(): Promise<void> {
    this.logger.log('Starting weekly leaderboard recalculation...');

    const types = [
      LeaderboardType.Academic,
      LeaderboardType.Competitive,
      LeaderboardType.Community,
    ];
    for (const type of types) {
      try {
        const count = await this.leaderboardService.rebuildLeaderboard(type);
        this.logger.log(`Rebuilt ${type} leaderboard with ${count} entries`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Failed to rebuild ${type} leaderboard: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log('Weekly leaderboard recalculation completed');
  }
}

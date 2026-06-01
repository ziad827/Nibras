import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SYNC_PLATFORMS } from '../enums/competition.enums';
import { fetchers } from '../fetchers';
import { Contest } from '../schemas/contest.schema';
import { CompSyncLog } from '../schemas/comp-sync-log.schema';

@Injectable()
export class ContestSyncJob {
  private readonly logger = new Logger(ContestSyncJob.name);

  constructor(
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(CompSyncLog.name)
    private readonly syncLogModel: Model<CompSyncLog>,
  ) {}

  async run(): Promise<void> {
    for (const platform of SYNC_PLATFORMS) {
      const startedAt = new Date();
      try {
        const fetcher = fetchers[platform];
        if (!fetcher) continue;

        const contests = await fetcher.fetchContests();
        let upserted = 0;

        for (const c of contests) {
          await this.contestModel.findOneAndUpdate(
            { platform, platformContestId: c.platformContestId },
            {
              $set: {
                name: c.name,
                url: c.url,
                startsAt: c.startsAt,
                endsAt: c.endsAt,
                durationMinutes: c.durationMinutes,
                phase: c.phase,
                tags: c.tags,
              },
              $setOnInsert: {
                platform,
                platformContestId: c.platformContestId,
              },
            },
            { upsert: true },
          );
          upserted++;
        }

        await this.syncLogModel.create({
          jobType: 'contest_fetch',
          platform,
          status: 'success',
          itemCount: upserted,
          startedAt,
        });
        this.logger.log(`Contest sync: ${platform} — ${upserted} contests`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Contest sync failed: ${platform} — ${message}`);
        await this.syncLogModel.create({
          jobType: 'contest_fetch',
          platform,
          status: 'error',
          errorMessage: message,
          startedAt,
        });
      }
    }
  }
}

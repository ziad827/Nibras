import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PROBLEM_SYNC_PLATFORMS } from '../enums/competition.enums';
import { fetchers } from '../fetchers';
import { Problem } from '../schemas/problem.schema';
import { CompSyncLog } from '../schemas/comp-sync-log.schema';

@Injectable()
export class ProblemSyncJob {
  private readonly logger = new Logger(ProblemSyncJob.name);

  constructor(
    @InjectModel(Problem.name) private readonly problemModel: Model<Problem>,
    @InjectModel(CompSyncLog.name)
    private readonly syncLogModel: Model<CompSyncLog>,
  ) {}

  async run(): Promise<void> {
    for (const platform of PROBLEM_SYNC_PLATFORMS) {
      const startedAt = new Date();
      try {
        const fetcher = fetchers[platform];
        if (!fetcher) continue;

        const problems = await fetcher.fetchProblems();
        if (problems.length === 0) continue;

        let upserted = 0;
        const BATCH = 100;
        for (let i = 0; i < problems.length; i += BATCH) {
          const batch = problems.slice(i, i + BATCH);
          for (const p of batch) {
            await this.problemModel.findOneAndUpdate(
              { platform, platformProblemId: p.platformProblemId },
              {
                $set: {
                  title: p.title,
                  url: p.url,
                  difficulty: p.difficulty,
                  tags: p.tags,
                },
                $setOnInsert: {
                  platform,
                  platformProblemId: p.platformProblemId,
                },
              },
              { upsert: true },
            );
            upserted++;
          }
        }

        await this.syncLogModel.create({
          jobType: 'problem_fetch',
          platform,
          status: 'success',
          itemCount: upserted,
          startedAt,
        });
        this.logger.log(`Problem sync: ${platform} — ${upserted} problems`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Problem sync failed: ${platform} — ${message}`);
        await this.syncLogModel.create({
          jobType: 'problem_fetch',
          platform,
          status: 'error',
          errorMessage: message,
          startedAt,
        });
      }
    }
  }
}

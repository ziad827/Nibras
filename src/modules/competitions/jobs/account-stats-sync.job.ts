import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountVerificationStatus } from '../enums/competition.enums';
import { fetchers } from '../fetchers';
import { Contest } from '../schemas/contest.schema';
import { LinkedAccount } from '../schemas/linked-account.schema';
import { Problem } from '../schemas/problem.schema';
import { UserContestParticipation } from '../schemas/user-contest-participation.schema';
import { UserProblemProgress } from '../schemas/user-problem-progress.schema';
import { ReputationService } from '../services/reputation.service';

@Injectable()
export class AccountStatsSyncJob {
  private readonly logger = new Logger(AccountStatsSyncJob.name);

  constructor(
    @InjectModel(LinkedAccount.name)
    private readonly linkedAccountModel: Model<LinkedAccount>,
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(Problem.name) private readonly problemModel: Model<Problem>,
    @InjectModel(UserContestParticipation.name)
    private readonly participationModel: Model<UserContestParticipation>,
    @InjectModel(UserProblemProgress.name)
    private readonly progressModel: Model<UserProblemProgress>,
    private readonly reputationService: ReputationService,
  ) {}

  async run(): Promise<void> {
    const accounts = await this.linkedAccountModel
      .find({ verificationStatus: AccountVerificationStatus.Verified })
      .select('id userId platform handle platformMaxRating')
      .exec();

    for (const account of accounts) {
      try {
        await this.syncSingleAccount(account);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Stats sync failed: ${account.platform}/${account.handle} — ${message}`,
        );
      }
    }
  }

  async runForUser(userId: string): Promise<void> {
    const accounts = await this.linkedAccountModel
      .find({
        userId: new Types.ObjectId(userId),
        verificationStatus: AccountVerificationStatus.Verified,
      })
      .exec();
    for (const account of accounts) {
      await this.syncSingleAccount(account);
    }
  }

  private async syncSingleAccount(
    account: LinkedAccount & { _id: Types.ObjectId },
  ): Promise<void> {
    const fetcher = fetchers[account.platform];
    if (!fetcher) return;

    const stats = await fetcher.fetchUserStats(account.handle);
    const peakRating = Math.max(
      account.platformMaxRating ?? 0,
      stats.maxRating,
      stats.rating,
    );

    await this.linkedAccountModel.updateOne(
      { _id: account._id },
      {
        $set: {
          platformRating: stats.rating,
          platformMaxRating: peakRating > 0 ? peakRating : undefined,
          lastSyncAt: new Date(),
          ...(stats.metadata ? { platformMetadata: stats.metadata } : {}),
        },
      },
    );

    for (const ch of stats.contestHistory) {
      const contest = await this.contestModel
        .findOne({
          platform: account.platform,
          platformContestId: ch.platformContestId,
        })
        .exec();
      if (!contest) continue;

      await this.participationModel.findOneAndUpdate(
        { userId: account.userId, contestId: contest._id },
        {
          $set: {
            platform: account.platform,
            rank: ch.rank,
            participants: ch.participants || undefined,
            ratingBefore: ch.ratingBefore,
            ratingAfter: ch.ratingAfter,
            delta: ch.delta,
          },
          $setOnInsert: { userId: account.userId, contestId: contest._id },
        },
        { upsert: true },
      );
    }

    for (const pid of stats.solvedProblemIds) {
      const problem = await this.problemModel
        .findOne({
          platform: account.platform,
          platformProblemId: pid,
        })
        .exec();
      if (!problem) continue;

      await this.progressModel.findOneAndUpdate(
        { userId: account.userId, problemId: problem._id },
        {
          $set: { solved: true, solvedAt: new Date() },
          $setOnInsert: { userId: account.userId, problemId: problem._id },
        },
        { upsert: true },
      );
    }

    await this.reputationService.syncLinkedAccountAura(
      account.userId.toString(),
      account.platform,
    );
  }
}

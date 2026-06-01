import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AccountVerificationStatus,
  CompPlatform,
} from '../enums/competition.enums';
import { fetchers, pickVerificationProblem } from '../fetchers';
import { LinkedAccount } from '../schemas/linked-account.schema';
import { ReputationService } from './reputation.service';
import { AccountStatsSyncJob } from '../jobs/account-stats-sync.job';

@Injectable()
export class LinkedAccountsService {
  constructor(
    @InjectModel(LinkedAccount.name)
    private readonly linkedAccountModel: Model<LinkedAccount>,
    private readonly reputationService: ReputationService,
    private readonly accountStatsSyncJob: AccountStatsSyncJob,
  ) {}

  async listForUser(userId: string) {
    const accounts = await this.linkedAccountModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: 1 })
      .exec();

    return accounts.map((a) => ({
      host: a.platform,
      handle: a.handle,
      verified: a.verificationStatus === AccountVerificationStatus.Verified,
      verificationStatus: a.verificationStatus,
      rating: a.platformRating,
      maxRating: a.platformMaxRating,
      lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
      linkedAt: (a as { createdAt?: Date }).createdAt?.toISOString(),
      metadata: a.platformMetadata ?? null,
    }));
  }

  async linkAccount(userId: string, platform: string, handle: string) {
    const plat = platform as CompPlatform;
    if (!Object.values(CompPlatform).includes(plat)) {
      throw new BadRequestException('Unknown platform');
    }
    if (!fetchers[plat]) {
      throw new BadRequestException('Platform not supported for linking');
    }

    const trimmed = handle.trim();
    let verificationProblem: string | null = null;
    let verificationProblemMeta: {
      contestId: number;
      index: string;
      name: string;
    } | null = null;

    if (plat === CompPlatform.Codeforces) {
      const picked = pickVerificationProblem();
      verificationProblem = `${picked.contestId}/${picked.index}`;
      verificationProblemMeta = picked;
    }

    const account = await this.linkedAccountModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), platform: plat },
      {
        $set: {
          handle: trimmed,
          verificationStatus: AccountVerificationStatus.Pending,
          verifiedAt: null,
          verificationProblem,
        },
        $setOnInsert: { userId: new Types.ObjectId(userId), platform: plat },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return {
      host: account.platform,
      handle: account.handle,
      verified: false,
      linkedAt: (account as { createdAt?: Date }).createdAt?.toISOString(),
      verificationProblem: verificationProblemMeta
        ? {
            contestId: verificationProblemMeta.contestId,
            index: verificationProblemMeta.index,
            name: verificationProblemMeta.name,
            url: `https://codeforces.com/problemset/problem/${verificationProblemMeta.contestId}/${verificationProblemMeta.index}`,
          }
        : null,
    };
  }

  async unlinkAccount(userId: string, host: string) {
    await this.linkedAccountModel.deleteMany({
      userId: new Types.ObjectId(userId),
      platform: host as CompPlatform,
    });
    return { unlinked: true };
  }

  async verifyAccount(userId: string, host: string) {
    const account = await this.linkedAccountModel
      .findOne({
        userId: new Types.ObjectId(userId),
        platform: host as CompPlatform,
      })
      .exec();

    if (!account) throw new NotFoundException('Account not found');

    const fetcher = fetchers[host];
    if (!fetcher) throw new BadRequestException('Unknown platform');

    let verified = false;
    if (fetcher.verifyOwnership) {
      const result = await fetcher.verifyOwnership(
        account.handle,
        account.verificationProblem ?? undefined,
      );
      verified = result.verified;
    } else {
      const result = await fetcher.verifyHandle(account.handle);
      verified = result.valid;
    }

    if (!verified) return { verified: false };

    const handleInfo = await fetcher.verifyHandle(account.handle);
    const peakRating = Math.max(
      account.platformMaxRating ?? 0,
      handleInfo.maxRating ?? 0,
      handleInfo.rating ?? 0,
    );
    const currentRating = handleInfo.rating ?? null;

    await this.linkedAccountModel.updateOne(
      { _id: account._id },
      {
        $set: {
          verificationStatus: AccountVerificationStatus.Verified,
          verifiedAt: new Date(),
          platformRating: currentRating ?? undefined,
          platformMaxRating: peakRating > 0 ? peakRating : undefined,
        },
      },
    );

    const auraEarned = await this.reputationService.syncLinkedAccountAura(
      userId,
      account.platform,
    );

    void this.accountStatsSyncJob.runForUser(userId);

    return {
      verified: true,
      host: account.platform,
      handle: account.handle,
      rating: currentRating,
      maxRating: peakRating > 0 ? peakRating : handleInfo.maxRating,
      auraEarned,
    };
  }

  async triggerResync(userId: string, host: string) {
    const account = await this.linkedAccountModel
      .findOne({
        userId: new Types.ObjectId(userId),
        platform: host as CompPlatform,
      })
      .exec();
    if (!account) throw new NotFoundException('Account not found');

    await this.verifyAccount(userId, host);
    return { syncing: true };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompPlatform } from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import {
  UserRating,
  type UserRatingDocument,
} from '../schemas/user-rating.schema';
import { StandingsService } from './standings.service';

const K_FACTOR = 32;
const DEFAULT_RATING = 1200;

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(UserRating.name)
    private readonly userRatingModel: Model<UserRating>,
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    private readonly standingsService: StandingsService,
  ) {}

  expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  async getOrCreateRating(
    userId: string,
    platform = 'nibras',
  ): Promise<UserRatingDocument> {
    let doc = await this.userRatingModel
      .findOne({ userId: new Types.ObjectId(userId), platform })
      .exec();
    if (!doc) {
      doc = await this.userRatingModel.create({
        userId: new Types.ObjectId(userId),
        platform,
        rating: DEFAULT_RATING,
        maxRating: DEFAULT_RATING,
        history: [],
      });
    }
    return doc;
  }

  async getRatingHistory(userId: string, platform?: string) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (platform) filter.platform = platform;

    const ratings = await this.userRatingModel.find(filter).exec();
    return ratings.map((r) => ({
      platform: r.platform,
      rating: r.rating,
      maxRating: r.maxRating,
      lastUpdated: r.lastUpdated.toISOString(),
      history: r.history.map((h) => ({
        rating: h.rating,
        delta: h.delta,
        contestId: h.contestId?.toString(),
        recordedAt: h.recordedAt.toISOString(),
      })),
    }));
  }

  async applyEloForContest(contestId: string): Promise<void> {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest || contest.platform !== CompPlatform.Internal) return;

    const standings = await this.standingsService.recomputeStandings(contestId);
    const participants = standings.individual.filter((s) => s.userId);
    if (participants.length < 2) return;

    const ratings: number[] = [];
    for (const p of participants) {
      const doc = await this.getOrCreateRating(p.userId);
      ratings.push(doc.rating);
    }

    const n = participants.length;
    for (let i = 0; i < n; i++) {
      let score = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const actual = participants[i].rank < participants[j].rank ? 1 : 0;
        const expected = this.expectedScore(ratings[i], ratings[j]);
        score += actual - expected;
      }
      const delta = Math.round(K_FACTOR * score);
      const doc = await this.getOrCreateRating(participants[i].userId);
      doc.rating = Math.max(0, doc.rating + delta);
      doc.maxRating = Math.max(doc.maxRating, doc.rating);
      doc.history.push({
        rating: doc.rating,
        delta,
        contestId: contest._id,
        recordedAt: new Date(),
      });
      doc.lastUpdated = new Date();
      await this.userRatingModel.updateOne(
        { _id: doc._id },
        {
          $set: {
            rating: doc.rating,
            maxRating: doc.maxRating,
            history: doc.history,
            lastUpdated: doc.lastUpdated,
          },
        },
      );
    }
  }
}

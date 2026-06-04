import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '@modules/auth/schemas/user.schema';
import { PointsEngineService } from '@modules/gamification/services/points-engine.service';
import {
  ActivityType,
  ActivitySource,
} from '@modules/gamification/enums/gamification.enums';
import {
  CompPlatform,
  ContestStatus,
  SubmissionStatus,
} from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { Submission } from '../schemas/submission.schema';
import { RatingsService } from './ratings.service';
import { StandingsService } from './standings.service';

const TOP_BADGE_AURA = 5;

@Injectable()
export class PostContestService {
  private readonly logger = new Logger(PostContestService.name);

  constructor(
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly standingsService: StandingsService,
    private readonly ratingsService: RatingsService,
    private readonly pointsEngine: PointsEngineService,
  ) {}

  async processEndedContests(): Promise<void> {
    const ended = await this.contestModel
      .find({
        platform: CompPlatform.Internal,
        endsAt: { $lt: new Date() },
        status: { $nin: [ContestStatus.Archived, ContestStatus.Ended] },
      })
      .exec();

    for (const contest of ended) {
      await this.finalizeContest(contest);
    }
  }

  async finalizeContest(
    contest: Contest & { _id: Types.ObjectId },
  ): Promise<void> {
    const contestId = contest._id.toString();

    const standings = await this.standingsService.recomputeStandings(contestId);
    await this.ratingsService.applyEloForContest(contestId);

    const subs = await this.submissionModel
      .find({
        contestId: contest._id,
        status: SubmissionStatus.Accepted,
      })
      .exec();

    const solvesByProblem: Record<string, number> = {};
    for (const s of subs) {
      const pid = s.problemId.toString();
      solvesByProblem[pid] = (solvesByProblem[pid] ?? 0) + 1;
    }

    const topStandings = [
      ...standings.individual.slice(0, 10).map((r) => ({
        rank: r.rank,
        userId: r.userId || undefined,
        solved: r.solved,
        score: r.score,
      })),
      ...(standings.team ?? []).slice(0, 5).map((r) => ({
        rank: r.rank,
        teamId: r.teamId,
        solved: r.solved,
        score: r.score,
      })),
    ];

    const eloChanges: Array<{
      userId: string;
      delta: number;
      ratingAfter: number;
    }> = [];
    for (const row of standings.individual.slice(0, 20)) {
      if (!row.userId) continue;
      const rating = await this.ratingsService.getOrCreateRating(row.userId);
      const last = rating.history[rating.history.length - 1];
      if (last?.contestId?.equals(contest._id)) {
        eloChanges.push({
          userId: row.userId,
          delta: last.delta,
          ratingAfter: last.rating,
        });
      }
    }

    const badgesAwarded: Array<{
      userId: string;
      badge: string;
      auraDelta: number;
    }> = [];
    const totalParticipants = standings.individual.length;

    for (const participant of contest.participants) {
      const uid = participant.toString();
      await this.pointsEngine.award({
        userId: uid,
        activityType: ActivityType.ContestJoined,
        source: ActivitySource.Contests,
        resourceId: contestId,
        resourceType: 'Contest',
        dedupeKey: `contest_joined:${uid}:${contestId}`,
        skipBadgeCheck: true,
      });
    }

    for (const row of standings.individual) {
      if (!row.userId) continue;
      const uid = row.userId;
      const percentile =
        totalParticipants > 0 ? row.rank / totalParticipants : 1;

      if (percentile <= 0.1) {
        await this.pointsEngine.award({
          userId: uid,
          activityType: ActivityType.ContestTop10,
          source: ActivitySource.Contests,
          resourceId: contestId,
          resourceType: 'Contest',
          dedupeKey: `contest_top_10:${uid}:${contestId}`,
          skipBadgeCheck: true,
        });
      } else if (percentile <= 0.25) {
        await this.pointsEngine.award({
          userId: uid,
          activityType: ActivityType.ContestTop25,
          source: ActivitySource.Contests,
          resourceId: contestId,
          resourceType: 'Contest',
          dedupeKey: `contest_top_25:${uid}:${contestId}`,
          skipBadgeCheck: true,
        });
      }

      await this.userModel.updateOne(
        { _id: uid },
        { $inc: { reputationScore: TOP_BADGE_AURA } },
      );
      badgesAwarded.push({
        userId: uid,
        badge: `contest_top_${row.rank}`,
        auraDelta: TOP_BADGE_AURA,
      });
    }

    for (const elo of eloChanges) {
      if (elo.delta > 0) {
        await this.pointsEngine.award({
          userId: elo.userId,
          activityType: ActivityType.ContestRatingGain,
          source: ActivitySource.Contests,
          resourceId: contestId,
          resourceType: 'Contest',
          points: Math.min(Math.floor(elo.delta / 10), 30),
          dedupeKey: `contest_rating_gain:${elo.userId}:${contestId}`,
          metadata: { ratingChange: elo.delta },
          skipBadgeCheck: true,
        });
      }
    }

    contest.summaryReport = {
      generatedAt: new Date(),
      participantCount: contest.participants.length,
      solvesByProblem,
      topStandings,
      eloChanges,
      badgesAwarded,
    };
    contest.status = ContestStatus.Ended;
    await this.contestModel.updateOne(
      { _id: contest._id },
      {
        $set: {
          status: ContestStatus.Ended,
          summaryReport: contest.summaryReport,
        },
      },
    );

    this.logger.log(
      `Post-contest finalized: ${contest.name} (${contestId}), participants=${contest.participants.length}`,
    );
  }
}

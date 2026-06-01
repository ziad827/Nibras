import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisClientService } from '@database/redis-client.service';
import { ScoringMode, SubmissionStatus } from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { ContestTeam } from '../schemas/contest-team.schema';
import { Submission } from '../schemas/submission.schema';
import { User } from '@modules/auth/schemas/user.schema';

export type StandingEntry = {
  rank: number;
  userId: string;
  username?: string;
  teamId?: string;
  teamName?: string;
  solved: number;
  penalty: number;
  score: number;
};

export type ContestStandingsResult = {
  individual: StandingEntry[];
  team?: StandingEntry[];
};

type AggregatedStanding = {
  solved: Set<string>;
  wrongAttempts: Map<string, number>;
  penalty: number;
  score: number;
  isTeam: boolean;
};

@Injectable()
export class StandingsService {
  constructor(
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(ContestTeam.name)
    private readonly teamModel: Model<ContestTeam>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly redis: RedisClientService,
  ) {}

  icpcScore(solved: number, penaltyMinutes: number): number {
    return solved * 1_000_000 - penaltyMinutes;
  }

  ioiScore(totalPoints: number): number {
    return totalPoints;
  }

  private aggregateSubmissions(
    contest: Contest,
    subs: Submission[],
  ): {
    individual: Map<string, AggregatedStanding>;
    team: Map<string, AggregatedStanding>;
  } {
    const individual = new Map<string, AggregatedStanding>();
    const team = new Map<string, AggregatedStanding>();

    const ensure = (
      map: Map<string, AggregatedStanding>,
      key: string,
      isTeam: boolean,
    ) => {
      if (!map.has(key)) {
        map.set(key, {
          solved: new Set(),
          wrongAttempts: new Map(),
          penalty: 0,
          score: 0,
          isTeam,
        });
      }
      return map.get(key)!;
    };

    for (const sub of subs) {
      const pid = sub.problemId.toString();
      const useTeam = Boolean(contest.isTeamBased && sub.teamId);
      const key = useTeam ? sub.teamId!.toString() : sub.userId.toString();
      const entry = ensure(useTeam ? team : individual, key, useTeam);

      if (sub.status === SubmissionStatus.Accepted) {
        if (!entry.solved.has(pid)) {
          entry.solved.add(pid);
          const wrongs = entry.wrongAttempts.get(pid) ?? 0;
          const minutes =
            (sub.submittedAt.getTime() - contest.startsAt.getTime()) / 60000;
          if (contest.scoringMode === ScoringMode.Icpc) {
            entry.penalty += minutes + wrongs * 20;
          } else {
            entry.score += sub.score || 100;
          }
        }
      } else if (
        sub.status !== SubmissionStatus.Pending &&
        !entry.solved.has(pid)
      ) {
        entry.wrongAttempts.set(pid, (entry.wrongAttempts.get(pid) ?? 0) + 1);
      }
    }

    return { individual, team };
  }

  private buildRows(
    map: Map<string, AggregatedStanding>,
    scoringMode: ScoringMode,
  ): StandingEntry[] {
    const rows: StandingEntry[] = [];
    for (const [key, data] of map) {
      rows.push({
        rank: 0,
        userId: data.isTeam ? '' : key,
        teamId: data.isTeam ? key : undefined,
        solved: data.solved.size,
        penalty: data.penalty,
        score: data.score,
      });
    }
    rows.sort((a, b) => {
      if (scoringMode === ScoringMode.Icpc) {
        if (b.solved !== a.solved) return b.solved - a.solved;
        return a.penalty - b.penalty;
      }
      return b.score - a.score;
    });
    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
    return rows;
  }

  private async writeZset(
    key: string,
    rows: StandingEntry[],
    scoringMode: ScoringMode,
  ): Promise<void> {
    await this.redis.client.del(key);
    for (const row of rows) {
      const member = row.teamId || row.userId;
      if (!member) continue;
      const redisScore =
        scoringMode === ScoringMode.Icpc
          ? this.icpcScore(row.solved, row.penalty)
          : this.ioiScore(row.score);
      await this.redis.client.zadd(key, redisScore, member);
    }
  }

  async recomputeStandings(contestId: string): Promise<ContestStandingsResult> {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) return { individual: [] };

    const subs = await this.submissionModel
      .find({ contestId: new Types.ObjectId(contestId) })
      .sort({ submittedAt: 1 })
      .exec();

    const { individual: indMap, team: teamMap } = this.aggregateSubmissions(
      contest,
      subs,
    );

    const individual = this.buildRows(indMap, contest.scoringMode);
    await this.writeZset(
      this.redis.standingsKey(contestId),
      individual,
      contest.scoringMode,
    );

    let team: StandingEntry[] | undefined;
    if (contest.isTeamBased && teamMap.size > 0) {
      team = this.buildRows(teamMap, contest.scoringMode);
      const teams = await this.teamModel
        .find({ contestId: contest._id })
        .select('name')
        .exec();
      const nameById = new Map(teams.map((t) => [t._id.toString(), t.name]));
      for (const row of team) {
        if (row.teamId) row.teamName = nameById.get(row.teamId);
      }
      await this.writeZset(
        this.redis.teamStandingsKey(contestId),
        team,
        contest.scoringMode,
      );
    }

    const ttlSec = Math.max(
      3600,
      Math.ceil((contest.endsAt.getTime() - Date.now()) / 1000) + 86400,
    );
    await this.redis.client.expire(this.redis.standingsKey(contestId), ttlSec);
    if (contest.isTeamBased) {
      await this.redis.client.expire(
        this.redis.teamStandingsKey(contestId),
        ttlSec,
      );
    }

    return { individual, team };
  }

  private async readZset(
    redisKey: string,
    contestId: string,
    opts: { isTeam: boolean },
  ): Promise<StandingEntry[]> {
    const raw = await this.redis.client.zrevrange(
      redisKey,
      0,
      99,
      'WITHSCORES',
    );
    if (raw.length === 0) return [];

    const contest = await this.contestModel.findById(contestId).exec();
    const entries: StandingEntry[] = [];

    let teamNames = new Map<string, string>();
    if (opts.isTeam) {
      const teams = await this.teamModel
        .find({ contestId: new Types.ObjectId(contestId) })
        .select('name')
        .exec();
      teamNames = new Map(teams.map((t) => [t._id.toString(), t.name]));
    }

    for (let i = 0; i < raw.length; i += 2) {
      const memberId = raw[i];
      const score = parseFloat(raw[i + 1]);
      if (opts.isTeam) {
        entries.push({
          rank: Math.floor(i / 2) + 1,
          userId: '',
          teamId: memberId,
          teamName: teamNames.get(memberId),
          solved:
            contest?.scoringMode === ScoringMode.Icpc
              ? Math.floor(score / 1_000_000)
              : 0,
          penalty: 0,
          score: contest?.scoringMode === ScoringMode.Ioi ? score : 0,
        });
      } else {
        const user = await this.userModel
          .findById(memberId)
          .select('username')
          .exec();
        entries.push({
          rank: Math.floor(i / 2) + 1,
          userId: memberId,
          username: user?.username,
          solved:
            contest?.scoringMode === ScoringMode.Icpc
              ? Math.floor(score / 1_000_000)
              : 0,
          penalty: 0,
          score: contest?.scoringMode === ScoringMode.Ioi ? score : 0,
        });
      }
    }
    return entries;
  }

  async getStandings(contestId: string): Promise<ContestStandingsResult> {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) return { individual: [] };

    const individual = await this.readZset(
      this.redis.standingsKey(contestId),
      contestId,
      { isTeam: false },
    );

    let team: StandingEntry[] | undefined;
    if (contest.isTeamBased) {
      team = await this.readZset(
        this.redis.teamStandingsKey(contestId),
        contestId,
        { isTeam: true },
      );
    }

    if (individual.length === 0 && (!team || team.length === 0)) {
      return this.recomputeStandings(contestId);
    }

    return { individual, team };
  }
}

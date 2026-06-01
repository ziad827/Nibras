import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompPlatform, SubmissionStatus } from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { Submission } from '../schemas/submission.schema';
import { ContestTeam } from '../schemas/contest-team.schema';
import { JudgeService } from './judge.service';
import { StandingsService } from './standings.service';
import { ContestsGateway } from '../gateways/contests.gateway';

const TERMINAL_STATUSES = new Set<SubmissionStatus>([
  SubmissionStatus.Accepted,
  SubmissionStatus.WrongAnswer,
  SubmissionStatus.TimeLimitExceeded,
  SubmissionStatus.MemoryLimitExceeded,
  SubmissionStatus.RuntimeError,
  SubmissionStatus.CompilationError,
]);

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(ContestTeam.name)
    private readonly teamModel: Model<ContestTeam>,
    private readonly judgeService: JudgeService,
    private readonly standingsService: StandingsService,
    private readonly contestsGateway: ContestsGateway,
  ) {}

  async listContestSubmissions(
    contestId: string,
    query: { problemId?: string; page?: string; limit?: string },
  ) {
    const filter: Record<string, unknown> = {
      contestId: new Types.ObjectId(contestId),
    };
    if (query.problemId) {
      filter.problemId = new Types.ObjectId(query.problemId);
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));

    const [items, total] = await Promise.all([
      this.submissionModel
        .find(filter)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-code')
        .exec(),
      this.submissionModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((s) => ({
        id: s._id.toString(),
        userId: s.userId.toString(),
        problemId: s.problemId.toString(),
        teamId: s.teamId?.toString(),
        language: s.language,
        status: s.status,
        runtime: s.runtime,
        memory: s.memory,
        score: s.score,
        submittedAt: s.submittedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async submitSolution(
    userId: string,
    contestId: string,
    dto: { problemId: string; language: string; code: string },
  ) {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) throw new NotFoundException('Contest not found');
    if (contest.platform !== CompPlatform.Internal) {
      throw new BadRequestException('Submissions only for internal contests');
    }

    const now = new Date();
    if (now < contest.startsAt || now > contest.endsAt) {
      throw new ForbiddenException('Contest is not active');
    }

    const uid = new Types.ObjectId(userId);
    if (!contest.participants.some((p) => p.equals(uid))) {
      throw new ForbiddenException('Not registered for this contest');
    }

    let teamId: Types.ObjectId | undefined;
    if (contest.isTeamBased) {
      const team = await this.teamModel
        .findOne({ contestId: contest._id, members: uid })
        .exec();
      teamId = team?._id;
    }

    const submission = await this.submissionModel.create({
      userId: uid,
      problemId: new Types.ObjectId(dto.problemId),
      contestId: contest._id,
      teamId,
      language: dto.language,
      code: dto.code,
      status: SubmissionStatus.Pending,
      submittedAt: new Date(),
    });

    const status = await this.judgeService.judgeSubmission(
      submission._id.toString(),
    );

    if (TERMINAL_STATUSES.has(status)) {
      const standings =
        await this.standingsService.recomputeStandings(contestId);
      this.contestsGateway.emitStandings(contestId, standings);
    }

    const updated = await this.submissionModel.findById(submission._id).exec();

    return {
      id: submission._id.toString(),
      status: updated?.status ?? status,
      runtime: updated?.runtime,
      memory: updated?.memory,
      score: updated?.score ?? 0,
    };
  }
}

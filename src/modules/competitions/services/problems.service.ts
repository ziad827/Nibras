import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompPlatform } from '../enums/competition.enums';
import { Problem } from '../schemas/problem.schema';
import type { CreateProblemDto } from '../dto/competitions.dto';
import { ProblemBookmark } from '../schemas/problem-bookmark.schema';
import { UserProblemProgress } from '../schemas/user-problem-progress.schema';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectModel(Problem.name) private readonly problemModel: Model<Problem>,
    @InjectModel(ProblemBookmark.name)
    private readonly bookmarkModel: Model<ProblemBookmark>,
    @InjectModel(UserProblemProgress.name)
    private readonly progressModel: Model<UserProblemProgress>,
  ) {}

  async listProblems(
    userId: string,
    query: {
      tag?: string;
      difficultyMin?: string;
      difficultyMax?: string;
      host?: string;
      q?: string;
      page?: string;
      limit?: string;
      solved?: string;
    },
  ) {
    const filter: Record<string, unknown> = {};
    if (query.host) filter.platform = query.host;
    if (query.tag) filter.tags = query.tag;
    if (query.q) filter.title = { $regex: query.q, $options: 'i' };

    const diff: Record<string, number> = {};
    if (query.difficultyMin) diff.$gte = parseInt(query.difficultyMin, 10);
    if (query.difficultyMax) diff.$lte = parseInt(query.difficultyMax, 10);
    if (Object.keys(diff).length) filter.difficulty = diff;

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));

    const [problems, total] = await Promise.all([
      this.problemModel
        .find(filter)
        .sort({ difficulty: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.problemModel.countDocuments(filter).exec(),
    ]);

    const problemIds = problems.map((p) => p._id);
    const [progress, bookmarks] = await Promise.all([
      this.progressModel.find({
        userId: new Types.ObjectId(userId),
        problemId: { $in: problemIds },
      }),
      this.bookmarkModel.find({
        userId: new Types.ObjectId(userId),
        problemId: { $in: problemIds },
      }),
    ]);

    const solvedSet = new Set(
      progress.filter((p) => p.solved).map((p) => p.problemId.toString()),
    );
    const bookmarkedSet = new Set(bookmarks.map((b) => b.problemId.toString()));

    let items = problems.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      host: p.platform,
      difficulty: p.difficulty,
      tags: p.tags,
      url: p.url,
      solved: solvedSet.has(p._id.toString()),
      bookmarked: bookmarkedSet.has(p._id.toString()),
    }));

    if (query.solved === 'true') items = items.filter((i) => i.solved);
    if (query.solved === 'false') items = items.filter((i) => !i.solved);

    return { items, total };
  }

  async createInternalProblem(dto: CreateProblemDto) {
    const slug = `internal-${Date.now()}`;
    const problem = await this.problemModel.create({
      platform: CompPlatform.Internal,
      platformProblemId: slug,
      title: dto.title,
      description: dto.description,
      difficulty: dto.difficulty ?? 0,
      tags: dto.tags ?? [],
      source: dto.source ?? 'nibras',
      externalId: slug,
      constraints: dto.constraints,
      testCases: dto.testCases ?? [],
      sampleIO: dto.sampleIO ?? [],
    });

    return {
      id: problem._id.toString(),
      title: problem.title,
      host: problem.platform,
      difficulty: problem.difficulty,
      tags: problem.tags,
    };
  }

  async setBookmark(userId: string, problemId: string, on?: boolean) {
    if (on === false) {
      await this.bookmarkModel.deleteMany({
        userId: new Types.ObjectId(userId),
        problemId: new Types.ObjectId(problemId),
      });
      return { bookmarked: false };
    }

    await this.bookmarkModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        problemId: new Types.ObjectId(problemId),
      },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          problemId: new Types.ObjectId(problemId),
        },
      },
      { upsert: true },
    );
    return { bookmarked: true };
  }
}

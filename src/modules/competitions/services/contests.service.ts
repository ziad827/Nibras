import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CompPlatform,
  ContestStatus,
  ScoringMode,
} from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { ContestBookmark } from '../schemas/contest-bookmark.schema';
import { ContestReminder } from '../schemas/contest-reminder.schema';
import { UserContestParticipation } from '../schemas/user-contest-participation.schema';
import { effectiveDurationMinutes } from '../utils/contest-duration';
import { StandingsService } from './standings.service';

export type ListContestsQuery = {
  upcoming?: string;
  active?: string;
  past?: string;
  host?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class ContestsService {
  constructor(
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(ContestBookmark.name)
    private readonly bookmarkModel: Model<ContestBookmark>,
    @InjectModel(ContestReminder.name)
    private readonly reminderModel: Model<ContestReminder>,
    @InjectModel(UserContestParticipation.name)
    private readonly participationModel: Model<UserContestParticipation>,
    private readonly standingsService: StandingsService,
  ) {}

  async listContests(query: ListContestsQuery, userId?: string) {
    const filter: Record<string, unknown> = { archivedAt: { $exists: false } };
    const now = new Date();
    const hasDateFilter =
      query.upcoming || query.active || query.past || query.from || query.to;

    if (query.upcoming === 'true') {
      filter.startsAt = { $gte: now };
    } else if (query.active === 'true') {
      filter.startsAt = { $lte: now };
      filter.endsAt = { $gte: now };
    } else if (query.past === 'true') {
      filter.endsAt = { $lt: now };
    }
    if (query.host) {
      filter.platform = query.host;
    }
    if (query.from || query.to) {
      filter.startsAt = {
        ...(typeof filter.startsAt === 'object' ? filter.startsAt : {}),
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));

    const [contests, total] = await Promise.all([
      this.contestModel
        .find(filter)
        .sort({ startsAt: hasDateFilter ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.contestModel.countDocuments(filter).exec(),
    ]);

    let bookmarkedIds = new Set<string>();
    let reminderIds = new Set<string>();
    if (userId && contests.length > 0) {
      const contestIds = contests.map((c) => c._id);
      const [bookmarks, reminders] = await Promise.all([
        this.bookmarkModel.find({ userId, contestId: { $in: contestIds } }),
        this.reminderModel.find({ userId, contestId: { $in: contestIds } }),
      ]);
      bookmarkedIds = new Set(bookmarks.map((b) => b.contestId.toString()));
      reminderIds = new Set(reminders.map((r) => r.contestId.toString()));
    }

    return {
      items: contests.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        host: c.platform,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        durationMinutes: effectiveDurationMinutes(
          c.startsAt,
          c.endsAt,
          c.durationMinutes,
        ),
        url: c.url,
        phase: c.phase,
        tags: c.tags,
        bookmarked: bookmarkedIds.has(c._id.toString()),
        reminderSet: reminderIds.has(c._id.toString()),
      })),
      total,
    };
  }

  async getCalendar(month?: string, year?: string, userId?: string) {
    const now = new Date();
    const m = parseInt(month ?? String(now.getMonth() + 1), 10);
    const y = parseInt(year ?? String(now.getFullYear()), 10);

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

    const startDay = startOfMonth.getDay();
    const calendarStart = new Date(startOfMonth);
    calendarStart.setDate(calendarStart.getDate() - startDay);
    const calendarEnd = new Date(endOfMonth);
    const remaining = 6 - endOfMonth.getDay();
    calendarEnd.setDate(calendarEnd.getDate() + remaining);

    const contests = await this.contestModel
      .find({
        startsAt: { $gte: calendarStart, $lte: calendarEnd },
        archivedAt: { $exists: false },
      })
      .sort({ startsAt: 1 })
      .exec();

    let bookmarkedIds = new Set<string>();
    let reminderIds = new Set<string>();
    if (userId && contests.length > 0) {
      const contestIds = contests.map((c) => c._id);
      const [bookmarks, reminders] = await Promise.all([
        this.bookmarkModel.find({ userId, contestId: { $in: contestIds } }),
        this.reminderModel.find({ userId, contestId: { $in: contestIds } }),
      ]);
      bookmarkedIds = new Set(bookmarks.map((b) => b.contestId.toString()));
      reminderIds = new Set(reminders.map((r) => r.contestId.toString()));
    }

    const days: Record<string, Array<Record<string, unknown>>> = {};
    for (const c of contests) {
      const dateKey = c.startsAt.toISOString().slice(0, 10);
      if (!days[dateKey]) days[dateKey] = [];
      days[dateKey].push({
        id: c._id.toString(),
        name: c.name,
        host: c.platform,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        durationMinutes: effectiveDurationMinutes(
          c.startsAt,
          c.endsAt,
          c.durationMinutes,
        ),
        url: c.url,
        phase: c.phase,
        bookmarked: bookmarkedIds.has(c._id.toString()),
        reminderSet: reminderIds.has(c._id.toString()),
      });
    }

    return {
      month: m,
      year: y,
      calendarStart: calendarStart.toISOString(),
      calendarEnd: calendarEnd.toISOString(),
      days,
    };
  }

  async setReminder(
    userId: string,
    contestId: string,
    on?: boolean,
    minutesBefore?: number,
  ) {
    if (on === false) {
      await this.reminderModel.deleteMany({
        userId: new Types.ObjectId(userId),
        contestId: new Types.ObjectId(contestId),
      });
      return { reminderSet: false };
    }

    await this.reminderModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        contestId: new Types.ObjectId(contestId),
      },
      {
        $set: { minutesBefore: minutesBefore ?? 30, notified: false },
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          contestId: new Types.ObjectId(contestId),
        },
      },
      { upsert: true },
    );
    return { reminderSet: true };
  }

  async setBookmark(userId: string, contestId: string, on?: boolean) {
    if (on === false) {
      await this.bookmarkModel.deleteMany({
        userId: new Types.ObjectId(userId),
        contestId: new Types.ObjectId(contestId),
      });
      return { bookmarked: false };
    }

    await this.bookmarkModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        contestId: new Types.ObjectId(contestId),
      },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          contestId: new Types.ObjectId(contestId),
        },
      },
      { upsert: true },
    );
    return { bookmarked: true };
  }

  async getHistory(userId: string, host?: string) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (host) filter.platform = host;

    const participations = await this.participationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('contestId', 'name startsAt')
      .exec();

    return participations.map((p) => {
      const contest = p.contestId as unknown as {
        name: string;
        startsAt: Date;
      };
      return {
        contestId: p.contestId.toString(),
        name: contest?.name ?? '',
        startedAt: contest?.startsAt?.toISOString() ?? '',
        rank: p.rank ?? 0,
        participants: p.participants ?? 0,
        delta: p.delta ?? 0,
        ratingAfter: p.ratingAfter ?? 0,
      };
    });
  }

  async createInternalContest(
    userId: string,
    dto: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      duration?: number;
      isTeamBased?: boolean;
      scoringMode?: ScoringMode;
      problemIds?: string[];
    },
  ) {
    const startsAt = new Date(dto.startDate);
    const endsAt = new Date(dto.endDate);
    const durationMinutes =
      dto.duration ??
      Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);

    const contest = await this.contestModel.create({
      platform: CompPlatform.Internal,
      platformContestId: `internal-${Date.now()}`,
      name: dto.name,
      description: dto.description,
      url: undefined,
      startsAt,
      endsAt,
      durationMinutes,
      phase: 'BEFORE',
      tags: ['internal'],
      status: ContestStatus.Scheduled,
      createdBy: new Types.ObjectId(userId),
      participants: [],
      problems: (dto.problemIds ?? []).map((id) => new Types.ObjectId(id)),
      isTeamBased: dto.isTeamBased ?? false,
      scoringMode: dto.scoringMode ?? ScoringMode.Icpc,
    });

    return this.toContestDetail(contest);
  }

  async updateContest(
    contestId: string,
    dto: Partial<{
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      status: ContestStatus;
      isTeamBased: boolean;
      scoringMode: ScoringMode;
      problemIds: string[];
    }>,
  ) {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) throw new NotFoundException('Contest not found');
    if (contest.platform !== CompPlatform.Internal) {
      throw new ForbiddenException('Only internal contests can be updated');
    }

    if (dto.name) contest.name = dto.name;
    if (dto.description !== undefined) contest.description = dto.description;
    if (dto.startDate) contest.startsAt = new Date(dto.startDate);
    if (dto.endDate) contest.endsAt = new Date(dto.endDate);
    if (dto.status) contest.status = dto.status;
    if (dto.isTeamBased !== undefined) contest.isTeamBased = dto.isTeamBased;
    if (dto.scoringMode) contest.scoringMode = dto.scoringMode;
    if (dto.problemIds) {
      contest.problems = dto.problemIds.map((id) => new Types.ObjectId(id));
    }

    await contest.save();
    return this.toContestDetail(contest);
  }

  async archiveContest(contestId: string) {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) throw new NotFoundException('Contest not found');
    if (contest.platform !== CompPlatform.Internal) {
      throw new ForbiddenException('Only internal contests can be archived');
    }
    contest.archivedAt = new Date();
    contest.status = ContestStatus.Archived;
    await contest.save();
    return { archived: true };
  }

  async registerForContest(userId: string, contestId: string) {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) throw new NotFoundException('Contest not found');
    if (contest.platform !== CompPlatform.Internal) {
      throw new BadRequestException('Registration only for internal contests');
    }

    const uid = new Types.ObjectId(userId);
    if (!contest.participants.some((p) => p.equals(uid))) {
      contest.participants.push(uid);
      await contest.save();
    }
    return { registered: true };
  }

  async getContestDetail(contestId: string) {
    const contest = await this.contestModel
      .findById(contestId)
      .populate('problems')
      .exec();
    if (!contest) throw new NotFoundException('Contest not found');

    const standings = await this.standingsService.getStandings(contestId);
    const detail = this.toContestDetail(contest);
    return {
      ...detail,
      standings: standings.individual,
      teamStandings: standings.team,
      summaryReport: contest.summaryReport,
    };
  }

  private toContestDetail(contest: Contest & { _id: Types.ObjectId }) {
    return {
      id: contest._id.toString(),
      name: contest.name,
      description: contest.description,
      host: contest.platform,
      startsAt: contest.startsAt.toISOString(),
      endsAt: contest.endsAt.toISOString(),
      durationMinutes: effectiveDurationMinutes(
        contest.startsAt,
        contest.endsAt,
        contest.durationMinutes,
      ),
      status: contest.status,
      isTeamBased: contest.isTeamBased,
      scoringMode: contest.scoringMode,
      problems: contest.problems,
      participants: contest.participants.map((p) => p.toString()),
    };
  }
}

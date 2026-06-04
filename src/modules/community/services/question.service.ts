import { Model, Types, SortOrder } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Question } from '../schemas/question.schema';
import { Answer } from '../schemas/answer.schema';
import { Tag } from '../schemas/tag.schema';
import { QuestionBookmark } from '../schemas/question-bookmark.schema';
import { TagService } from './tag.service';
import {
  IRealtimeEvents,
  IActivityEventService,
} from '../interfaces/external-services.interface';
import { PopulatedQuestion, PopulatedTag } from '../interfaces/populated.types';
import { PaginationMeta } from '../interfaces/service-return.types';

const HOT_THREADS_CACHE_KEY = 'community:hot-threads';
const HOT_THREADS_TTL_MS = 5 * 60 * 1000;
const QUESTION_CACHE_PREFIX = 'community:question:';
const QUESTION_CACHE_TTL_MS = 5 * 60 * 1000;

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

function extractTagNames(tags: PopulatedTag[] | Types.ObjectId[]): string[] {
  if (!tags || tags.length === 0) return [];
  return tags.map((t) => {
    if ('name' in (t as unknown as Record<string, unknown>)) {
      return (t as PopulatedTag).name ?? String((t as PopulatedTag)._id);
    }
    if (t instanceof Types.ObjectId) return t.toString();
    return '';
  });
}

type SortField = 'createdAt' | 'votesCount' | 'answersCount' | 'viewCount';
type SortDir = 'asc' | 'desc';

function parseSortValue(sort?: string): { field: SortField; dir: SortDir } {
  const allowed: SortField[] = [
    'createdAt',
    'votesCount',
    'answersCount',
    'viewCount',
  ];
  if (!sort) return { field: 'createdAt', dir: 'desc' };
  const parts = sort.split(':');
  const field = allowed.includes(parts[0] as SortField)
    ? (parts[0] as SortField)
    : 'createdAt';
  const dir: SortDir = parts[1] === 'asc' ? 'asc' : 'desc';
  return { field, dir };
}

@Injectable()
export class QuestionService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<Question>,
    @InjectModel(Answer.name) private answerModel: Model<Answer>,
    @InjectModel(Tag.name) private tagModel: Model<Tag>,
    @InjectModel(QuestionBookmark.name)
    private bookmarkModel: Model<QuestionBookmark>,
    private tagService: TagService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  setRealtimeEvents(events: IRealtimeEvents) {
    this.realtimeEvents = events;
  }
  private realtimeEvents?: IRealtimeEvents;

  setActivityEventService(service: IActivityEventService) {
    this.activityEventService = service;
  }
  private activityEventService?: IActivityEventService;

  async create(data: {
    title: string;
    body: string;
    author: string;
    tags?: string[];
    course?: string;
    isAnonymous?: boolean;
  }) {
    const tagIds: Types.ObjectId[] = [];
    if (data.tags?.length) {
      for (const tagName of data.tags) {
        try {
          const tagId = await this.tagService.getTagIdByName(tagName);
          tagIds.push(new Types.ObjectId(tagId));
        } catch {
          /* skip */
        }
      }
      if (tagIds.length) {
        await this.tagModel.updateMany(
          { _id: { $in: tagIds } },
          { $inc: { usageCount: 1 } },
        );
      }
    }

    const question = await this.questionModel.create({
      author: data.author,
      course: data.course,
      title: data.title,
      body: data.body,
      tags: tagIds,
      isAnonymous: data.isAnonymous ?? false,
    });

    const populated = await this.questionModel
      .findById(question._id)
      .populate('author')
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!populated) throw new Error('Failed to retrieve created question');

    const result: Omit<PopulatedQuestion, 'tags'> & { tags: string[] } = {
      ...populated,
      tags: extractTagNames(populated.tags),
    };

    this.realtimeEvents?.emitQuestionCreated(result);
    await this.activityEventService?.recordQuestionCreated({
      userId: populated.author?._id ?? populated.author,
      questionId: populated._id,
      courseId:
        (populated.course as { _id: Types.ObjectId })?._id ??
        populated.course ??
        null,
      occurredAt: populated.createdAt,
      roleSnapshot: populated.author?.role?.name ?? null,
    });

    await this.cacheManager.del(HOT_THREADS_CACHE_KEY);

    return result;
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
    title?: string;
    tag?: string;
    course?: string;
    status?: string;
    sort?: string;
  }): Promise<{
    questions: (Omit<PopulatedQuestion, 'tags'> & { tags: string[] })[];
    pagination: PaginationMeta;
  }> {
    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    const { page, limit, skip } = normalizePagination(
      filters.page,
      filters.limit,
    );

    if (filters.search) query.$text = { $search: filters.search };
    if (filters.title) query.title = { $regex: filters.title, $options: 'i' };
    if (filters.tag) {
      const tag = await this.tagService.getTagByName(filters.tag);
      query.tags = tag ? tag._id : { $size: 0 };
    }
    if (filters.course) query.course = new Types.ObjectId(filters.course);
    if (filters.status) query.status = filters.status;

    const sortConfig = parseSortValue(filters.sort);
    const sortOptions: Record<string, SortOrder | { $meta: 'textScore' }> = {
      [sortConfig.field]: sortConfig.dir === 'asc' ? 1 : -1,
    };
    if (filters.search) sortOptions.score = { $meta: 'textScore' };

    const [questions, total] = await Promise.all([
      this.questionModel
        .find(query)
        .populate('author')
        .populate('course')
        .populate('tags')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean<PopulatedQuestion[]>(),
      this.questionModel.countDocuments(query),
    ]);

    const data: (Omit<PopulatedQuestion, 'tags'> & { tags: string[] })[] =
      questions.map((q) => ({
        ...q,
        tags: extractTagNames(q.tags),
      }));

    return {
      questions: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(
    id: string,
  ): Promise<(Omit<PopulatedQuestion, 'tags'> & { tags: string[] }) | null> {
    const question = await this.questionModel
      .findById(id)
      .populate('author')
      .populate('course')
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!question || question.isDeleted) return null;

    await this.questionModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    return { ...question, tags: extractTagNames(question.tags) };
  }

  async findByIdCached(
    id: string,
  ): Promise<(Omit<PopulatedQuestion, 'tags'> & { tags: string[] }) | null> {
    const cacheKey = `${QUESTION_CACHE_PREFIX}${id}`;
    const cached = await this.cacheManager.get<
      Omit<PopulatedQuestion, 'tags'> & { tags: string[] }
    >(cacheKey);
    if (cached) return cached;

    const question = await this.findById(id);
    if (question) {
      await this.cacheManager.set(cacheKey, question, QUESTION_CACHE_TTL_MS);
    }
    return question;
  }

  async update(
    id: string,
    data: {
      title?: string;
      body?: string;
      tags?: string[];
      course?: string;
      isAnonymous?: boolean;
      status?: string;
    },
  ): Promise<(Omit<PopulatedQuestion, 'tags'> & { tags: string[] }) | null> {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.course !== undefined) updateData.course = data.course;
    if (data.isAnonymous !== undefined)
      updateData.isAnonymous = data.isAnonymous;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.tags) {
      const oldQuestion = await this.questionModel
        .findById(id)
        .lean<{ tags?: Types.ObjectId[] }>();
      const oldTagIds = oldQuestion ? (oldQuestion.tags ?? []).map(String) : [];

      const newTagIds: Types.ObjectId[] = [];
      for (const tagName of data.tags) {
        try {
          const tagId = await this.tagService.getTagIdByName(tagName);
          newTagIds.push(new Types.ObjectId(tagId));
        } catch {
          /* skip */
        }
      }

      const added = newTagIds.filter((tid) => !oldTagIds.includes(String(tid)));
      const removed = oldTagIds.filter(
        (old: string) => !newTagIds.some((n) => String(n) === old),
      );

      if (added.length)
        await this.tagModel.updateMany(
          { _id: { $in: added } },
          { $inc: { usageCount: 1 } },
        );
      if (removed.length)
        await this.tagModel.updateMany(
          { _id: { $in: removed } },
          { $inc: { usageCount: -1 } },
        );

      updateData.tags = newTagIds;
    }

    const updated = await this.questionModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .populate('author')
      .populate('course')
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!updated) return null;

    await this.cacheManager.del(`${QUESTION_CACHE_PREFIX}${id}`);
    await this.cacheManager.del(HOT_THREADS_CACHE_KEY);

    return { ...updated, tags: extractTagNames(updated.tags) };
  }

  async softDelete(id: string) {
    const question = await this.questionModel
      .findById(id)
      .lean<{ tags?: Types.ObjectId[] }>();
    if (question?.tags?.length) {
      await this.tagModel.updateMany(
        { _id: { $in: question.tags } },
        { $inc: { usageCount: -1 } },
      );
    }
    const result = await this.questionModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    await this.cacheManager.del(`${QUESTION_CACHE_PREFIX}${id}`);
    await this.cacheManager.del(HOT_THREADS_CACHE_KEY);
    return result;
  }

  async delete(id: string) {
    const question = await this.questionModel
      .findById(id)
      .lean<{ tags?: Types.ObjectId[] }>();
    if (question?.tags?.length) {
      await this.tagModel.updateMany(
        { _id: { $in: question.tags } },
        { $inc: { usageCount: -1 } },
      );
    }
    await this.answerModel.deleteMany({ question: id });
    await this.cacheManager.del(`${QUESTION_CACHE_PREFIX}${id}`);
    await this.cacheManager.del(HOT_THREADS_CACHE_KEY);
    return this.questionModel.findByIdAndDelete(id);
  }

  async setBookmark(userId: string, questionId: string, on?: boolean) {
    if (on === false) {
      await this.bookmarkModel.deleteMany({
        userId: new Types.ObjectId(userId),
        questionId: new Types.ObjectId(questionId),
      });
      return { bookmarked: false };
    }
    await this.bookmarkModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        questionId: new Types.ObjectId(questionId),
      },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          questionId: new Types.ObjectId(questionId),
        },
      },
      { upsert: true },
    );
    return { bookmarked: true };
  }

  async getBookmarkedQuestions(userId: string, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);

    const [bookmarks, total] = await Promise.all([
      this.bookmarkModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      this.bookmarkModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    const questionIds = bookmarks.map((b) => b.questionId);
    const questions = await this.questionModel
      .find({ _id: { $in: questionIds } })
      .populate('author')
      .populate('course')
      .populate('tags')
      .lean<PopulatedQuestion[]>();

    const questionsMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const data = bookmarks
      .map((b) => {
        const q = questionsMap.get(b.questionId.toString());
        if (!q) return null;
        return { ...q, tags: extractTagNames(q.tags) };
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);

    return {
      questions: data,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1,
      },
    };
  }

  async getHotThreads(limit = 50) {
    const cached = await this.cacheManager.get<
      (Omit<PopulatedQuestion, 'tags'> & { tags: string[] })[]
    >(HOT_THREADS_CACHE_KEY);
    if (cached) return cached;

    const questions = await this.questionModel
      .find({ isDeleted: { $ne: true }, status: 'open' })
      .populate('author')
      .populate('course')
      .populate('tags')
      .sort({ votesCount: -1, answersCount: -1, viewCount: -1 })
      .limit(limit)
      .lean<PopulatedQuestion[]>();

    const data = questions.map((q) => ({
      ...q,
      tags: extractTagNames(q.tags),
    }));

    await this.cacheManager.set(
      HOT_THREADS_CACHE_KEY,
      data,
      HOT_THREADS_TTL_MS,
    );
    return data;
  }
}

import { Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Thread } from '../schemas/thread.schema';
import { Post } from '../schemas/post.schema';
import { Tag } from '../schemas/tag.schema';
import { TagService } from './tag.service';
import { CreateThreadDto, UpdateThreadDto } from '../dto/thread.dto';
import {
  IRealtimeEvents,
  IActivityEventService,
} from '../interfaces/external-services.interface';
import { PopulatedThread, PopulatedTag } from '../interfaces/populated.types';

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

function extractTagNames(tags: PopulatedTag[]): string[] {
  return tags.map((t) => t.name ?? String(t._id));
}

@Injectable()
export class ThreadService {
  constructor(
    @InjectModel(Thread.name) private threadModel: Model<Thread>,
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(Tag.name) private tagModel: Model<Tag>,
    private tagService: TagService,
  ) {}

  setRealtimeEvents(events: IRealtimeEvents) {
    this.realtimeEvents = events;
  }
  private realtimeEvents?: IRealtimeEvents;

  setActivityEventService(service: IActivityEventService) {
    this.activityEventService = service;
  }
  private activityEventService?: IActivityEventService;

  async create(data: CreateThreadDto & { author: string; course: string }) {
    const tagIds: Types.ObjectId[] = [];
    if (data.tags?.length) {
      for (const tagName of data.tags) {
        try {
          const tagId = await this.tagService.getTagIdByName(tagName);
          const objId = new Types.ObjectId(tagId);
          tagIds.push(objId);
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

    const thread = await this.threadModel.create({
      title: data.title,
      body: data.body,
      course: data.course,
      author: data.author,
      tags: tagIds,
    });

    const populated = await this.threadModel
      .findById(thread._id)
      .populate('author', 'name avatar role')
      .populate('course', 'title')
      .populate('tags')
      .lean<PopulatedThread>();

    if (!populated) throw new Error('Failed to retrieve created thread');

    const result: Omit<PopulatedThread, 'tags'> & { tags: string[] } = {
      ...populated,
      tags: extractTagNames(populated.tags),
    };

    this.realtimeEvents?.emitThreadCreated(result);
    await this.activityEventService?.recordThreadCreated({
      userId: populated.author?._id ?? populated.author,
      threadId: populated._id,
      courseId: populated.course?._id ?? populated.course ?? null,
      occurredAt: populated.createdAt,
      roleSnapshot: populated.author?.role?.name ?? null,
    });

    return result;
  }

  async findByCourse(
    courseId: string,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      tag?: string;
    },
  ) {
    const query: Record<string, unknown> = {
      course: new Types.ObjectId(courseId),
    };
    const { page, limit, skip } = normalizePagination(
      filters.page,
      filters.limit,
    );

    if (filters.search) query.$text = { $search: filters.search };
    if (filters.status) query.status = filters.status;
    if (filters.tag) {
      const tag = await this.tagService.getTagByName(filters.tag);
      query.tags = tag ? tag._id : { $size: 0 };
    }

    const [threads, total] = await Promise.all([
      this.threadModel
        .find(query)
        .populate('author', 'name avatar role')
        .populate('tags')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<PopulatedThread[]>(),
      this.threadModel.countDocuments(query),
    ]);

    const data: (Omit<PopulatedThread, 'tags'> & { tags: string[] })[] =
      threads.map((t) => ({
        ...t,
        tags: extractTagNames(t.tags),
      }));

    return {
      threads: data,
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
  ): Promise<(Omit<PopulatedThread, 'tags'> & { tags: string[] }) | null> {
    const thread = await this.threadModel
      .findById(id)
      .populate('author', 'name avatar role')
      .populate('course', 'title')
      .populate('tags')
      .lean<PopulatedThread>();

    if (!thread) return null;
    return {
      ...thread,
      tags: extractTagNames(thread.tags),
    };
  }

  async update(
    id: string,
    data: UpdateThreadDto,
  ): Promise<(Omit<PopulatedThread, 'tags'> & { tags: string[] }) | null> {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;

    if (data.tags) {
      const oldThread = await this.threadModel
        .findById(id)
        .lean<{ tags?: Types.ObjectId[] }>();
      const oldTagIds = oldThread ? (oldThread.tags ?? []).map(String) : [];

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
        (old) => !newTagIds.some((n) => String(n) === old),
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

    const updated = await this.threadModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .populate('author', 'name avatar role')
      .populate('course', 'title')
      .populate('tags')
      .lean<PopulatedThread>();

    if (!updated) return null;
    return {
      ...updated,
      tags: extractTagNames(updated.tags ?? []),
    };
  }

  async delete(id: string) {
    const thread = await this.threadModel
      .findById(id)
      .lean<{ tags?: Types.ObjectId[] }>();
    if (!thread) return null;

    if ((thread.tags ?? []).length > 0) {
      await this.tagModel.updateMany(
        { _id: { $in: thread.tags } },
        { $inc: { usageCount: -1 } },
      );
    }
    await this.postModel.deleteMany({ thread: id });
    return this.threadModel.findByIdAndDelete(id);
  }

  async pin(id: string) {
    return this.threadModel.findByIdAndUpdate(
      id,
      { isPinned: true },
      { returnDocument: 'after' },
    );
  }

  async unpin(id: string) {
    return this.threadModel.findByIdAndUpdate(
      id,
      { isPinned: false },
      { returnDocument: 'after' },
    );
  }

  async close(id: string) {
    return this.threadModel.findByIdAndUpdate(
      id,
      { status: 'closed' },
      { returnDocument: 'after' },
    );
  }

  async open(id: string) {
    return this.threadModel.findByIdAndUpdate(
      id,
      { status: 'open' },
      { returnDocument: 'after' },
    );
  }
}

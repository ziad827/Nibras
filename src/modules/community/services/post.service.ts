import { Model } from 'mongoose';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Post } from '../schemas/post.schema';
import { Thread } from '../schemas/thread.schema';
import { IRealtimeEvents } from '../interfaces/external-services.interface';

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(Thread.name) private threadModel: Model<Thread>,
  ) {}

  setRealtimeEvents(events: IRealtimeEvents) {
    this.realtimeEvents = events;
  }
  private realtimeEvents?: IRealtimeEvents;

  async create(data: { body: string; thread: string; author: string }) {
    const thread = await this.threadModel.findById(data.thread);
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.status === 'closed') {
      throw new ForbiddenException(
        'This thread is closed. No new posts are allowed.',
      );
    }

    const post = await this.postModel.create(data);
    await this.threadModel.findByIdAndUpdate(data.thread, {
      $inc: { postsCount: 1 },
    });
    const populated = await this.postModel
      .findById(post._id)
      .populate('author', 'name avatar role');
    this.realtimeEvents?.emitPostCreated(String(data.thread), populated!);
    return populated;
  }

  async findByThread(threadId: string, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const [posts, total] = await Promise.all([
      this.postModel
        .find({ thread: threadId })
        .populate('author', 'name avatar role')
        .sort({ isPinned: -1, isAccepted: -1, votesCount: -1, createdAt: 1 })
        .skip(skip)
        .limit(l),
      this.postModel.countDocuments({ thread: threadId }),
    ]);
    return {
      posts,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1,
      },
    };
  }

  async findById(id: string) {
    return this.postModel.findById(id).populate('author', 'name avatar role');
  }

  async update(id: string, data: { body?: string }) {
    return this.postModel
      .findByIdAndUpdate(id, { ...data }, { returnDocument: 'after' })
      .populate('author', 'name avatar role');
  }

  async delete(id: string) {
    const post = await this.postModel.findByIdAndDelete(id);
    if (post?.thread) {
      await this.threadModel.findByIdAndUpdate(post.thread, {
        $inc: { postsCount: -1 },
      });
    }
    return post;
  }

  async pin(postId: string) {
    return this.postModel
      .findByIdAndUpdate(
        postId,
        { isPinned: true },
        { returnDocument: 'after' },
      )
      .populate('author', 'name avatar role');
  }

  async accept(postId: string, requestingUserId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const thread = await this.threadModel
      .findById(post.thread)
      .populate('course');
    if (!thread) throw new NotFoundException('Thread not found');

    const isThreadAuthor = String(thread.author) === String(requestingUserId);
    const course = (thread as unknown as Record<string, unknown>).course as
      | Record<string, unknown>
      | undefined;
    const isCourseInstructor = Boolean(
      course &&
      typeof course === 'object' &&
      String(course.instructor) === String(requestingUserId),
    );

    if (!isThreadAuthor && !isCourseInstructor) {
      throw new ForbiddenException(
        'Only the thread author or course instructor can accept a post',
      );
    }

    await this.postModel.updateMany(
      { thread: post.thread, _id: { $ne: postId } },
      { $set: { isAccepted: false } },
    );
    post.isAccepted = true;
    await post.save();

    return this.postModel
      .findById(postId)
      .populate('author', 'name avatar role');
  }
}

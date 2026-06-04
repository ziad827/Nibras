import { Model, Types } from 'mongoose';
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Vote } from '../schemas/vote.schema';
import { Question } from '../schemas/question.schema';
import { Answer } from '../schemas/answer.schema';
import { Thread } from '../schemas/thread.schema';
import { Post } from '../schemas/post.schema';
import {
  IRealtimeEvents,
  IActivityEventService,
  INotificationService,
} from '../interfaces/external-services.interface';
import { VoteResult, MyVoteResult } from '../interfaces/service-return.types';
import { VoteTarget } from '../interfaces/populated.types';

@Injectable()
export class VoteService {
  constructor(
    @InjectModel(Vote.name) private voteModel: Model<Vote>,
    @InjectModel(Question.name) private questionModel: Model<Question>,
    @InjectModel(Answer.name) private answerModel: Model<Answer>,
    @InjectModel(Thread.name) private threadModel: Model<Thread>,
    @InjectModel(Post.name) private postModel: Model<Post>,
  ) {}

  setRealtimeEvents(events: IRealtimeEvents) {
    this.realtimeEvents = events;
  }
  private realtimeEvents?: IRealtimeEvents;

  setActivityEventService(service: IActivityEventService) {
    this.activityEventService = service;
  }
  private activityEventService?: IActivityEventService;

  setNotificationService(service: INotificationService) {
    this.notificationService = service;
  }
  private notificationService?: INotificationService;

  private async findTarget(targetType: string, targetId: string) {
    switch (targetType) {
      case 'question':
        return this.questionModel
          .findById(targetId)
          .select('author question thread')
          .lean<VoteTarget>();
      case 'answer':
        return this.answerModel
          .findById(targetId)
          .select('author question thread')
          .lean<VoteTarget>();
      case 'thread':
        return this.threadModel
          .findById(targetId)
          .select('author question thread')
          .lean<VoteTarget>();
      case 'post':
        return this.postModel
          .findById(targetId)
          .select('author question thread')
          .lean<VoteTarget>();
      default:
        return null;
    }
  }

  private async updateTargetVotes(
    targetType: string,
    targetId: string,
    delta: 1 | -1,
  ) {
    const update = { $inc: { votesCount: delta } };
    switch (targetType) {
      case 'question':
        return this.questionModel.findByIdAndUpdate(targetId, update, {
          returnDocument: 'after',
          select: 'votesCount',
        });
      case 'answer':
        return this.answerModel.findByIdAndUpdate(targetId, update, {
          returnDocument: 'after',
          select: 'votesCount',
        });
      case 'thread':
        return this.threadModel.findByIdAndUpdate(targetId, update, {
          returnDocument: 'after',
          select: 'votesCount',
        });
      case 'post':
        return this.postModel.findByIdAndUpdate(targetId, update, {
          returnDocument: 'after',
          select: 'votesCount',
        });
      default:
        return null;
    }
  }

  async castVote({
    userId,
    targetType,
    targetId,
    value,
  }: {
    userId: string;
    targetType: string;
    targetId: string;
    value: 1 | -1;
  }): Promise<VoteResult> {
    if (!['question', 'answer', 'thread', 'post'].includes(targetType))
      throw new BadRequestException('Invalid targetType');
    if (!Types.ObjectId.isValid(targetId))
      throw new BadRequestException('Invalid targetId');
    if (value !== 1 && value !== -1)
      throw new BadRequestException('Invalid vote value. Must be 1 or -1');

    const target = await this.findTarget(targetType, targetId);

    if (!target) throw new NotFoundException(`${targetType} not found`);

    const targetAuthorId = target.author
      ? String((target.author as { _id: Types.ObjectId })._id ?? target.author)
      : null;
    if (targetAuthorId === userId) {
      throw new ForbiddenException('You cannot vote on your own content');
    }

    const roomContextId: string | undefined =
      targetType === 'question'
        ? String(target._id)
        : targetType === 'answer'
          ? String(target.question)
          : targetType === 'thread'
            ? String(target._id)
            : targetType === 'post'
              ? String(target.thread)
              : undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = await this.voteModel.findOne({
        user: userId,
        targetId,
        targetType,
      });

      let action: 'created' | 'updated' | 'removed' = 'created';
      let delta = value;
      let userVoteValue: number = value;

      if (existing && existing.value === value) {
        action = 'removed';
        delta = -value as 1 | -1;
        userVoteValue = 0;
      } else if (existing) {
        action = 'updated';
        delta = (value - existing.value) as 1 | -1;
        userVoteValue = value;
      }

      try {
        if (!existing) {
          await this.voteModel.create({
            user: userId,
            targetId,
            targetType,
            value,
          });
        } else if (action === 'removed') {
          await existing.deleteOne();
        } else {
          existing.value = value;
          await existing.save();
        }

        const updatedTarget = await this.updateTargetVotes(
          targetType,
          targetId,
          delta,
        );

        if (!updatedTarget) {
          if (!existing)
            await this.voteModel.deleteOne({
              user: userId,
              targetId,
              targetType,
            });
          else if (action === 'removed')
            await this.voteModel.create({
              user: userId,
              targetId,
              targetType,
              value: existing.value,
            });
          else
            await this.voteModel.updateOne(
              { _id: existing._id },
              { $set: { value: existing.value } },
            );
          throw new NotFoundException(`${targetType} not found`);
        }

        if (roomContextId) {
          const payload = {
            targetId,
            targetType,
            votesCount: updatedTarget.votesCount,
          };
          if (targetType === 'question' || targetType === 'answer') {
            this.realtimeEvents?.emitVoteUpdated(roomContextId, payload);
          } else {
            this.realtimeEvents?.emitVoteUpdatedForThread(
              roomContextId,
              payload,
            );
          }
        }

        if (
          (action === 'created' || (action === 'updated' && value === 1)) &&
          value === 1 &&
          (targetType === 'question' || targetType === 'answer')
        ) {
          let courseId: string | null = null;
          let questionId: string | null = null;
          let answerId: string | null = null;
          const threadId: string | null = null;

          if (targetType === 'question') {
            questionId = String(target._id);
            const fullQ = await this.questionModel
              .findById(target._id)
              .select('course')
              .lean<{ course?: Types.ObjectId }>();
            courseId = fullQ?.course ? String(fullQ.course) : null;
          } else if (targetType === 'answer') {
            answerId = String(target._id);
            const fullQ = await this.questionModel
              .findById(target.question)
              .select('course')
              .lean<{ course?: Types.ObjectId }>();
            questionId = target.question ? String(target.question) : null;
            courseId = fullQ?.course ? String(fullQ.course) : null;
          }

          await this.activityEventService?.recordVoteReward({
            userId: targetAuthorId,
            voteId: existing?._id ? String(existing._id) : null,
            voterId: userId,
            targetType,
            targetId: String(target._id),
            questionId,
            answerId,
            threadId,
            courseId,
            occurredAt: new Date(),
          });
        }

        if (value === 1 && (action === 'created' || action === 'updated')) {
          await this.notificationService?.notifyVote({
            targetType,
            targetId: String(target._id),
            recipientId: targetAuthorId,
            actorId: userId,
          });
        }

        return {
          action,
          voteValue: userVoteValue,
          votesCount: updatedTarget.votesCount,
        };
      } catch (err: unknown) {
        if ((err as Record<string, unknown>)?.code === 11000 && attempt === 0)
          continue;
        throw err;
      }
    }
    throw new Error('Vote processing failed after retries');
  }

  async getMyVote({
    userId,
    targetType,
    targetId,
  }: {
    userId: string;
    targetType: string;
    targetId: string;
  }): Promise<MyVoteResult> {
    if (!Types.ObjectId.isValid(targetId))
      throw new BadRequestException('Invalid targetId');
    const vote = await this.voteModel
      .findOne({ user: userId, targetId, targetType })
      .select('value');
    return { value: vote ? vote.value : 0 };
  }

  async removeVote({
    userId,
    targetType,
    targetId,
  }: {
    userId: string;
    targetType: string;
    targetId: string;
  }): Promise<VoteResult> {
    if (!Types.ObjectId.isValid(targetId))
      throw new BadRequestException('Invalid targetId');
    const existing = await this.voteModel.findOne({
      user: userId,
      targetId,
      targetType,
    });
    if (!existing) throw new NotFoundException('Vote not found');

    const delta = -existing.value as 1 | -1;
    await existing.deleteOne();

    const updatedTarget = await this.updateTargetVotes(
      targetType,
      targetId,
      delta,
    );
    if (!updatedTarget) throw new NotFoundException(`${targetType} not found`);

    return {
      action: 'removed',
      voteValue: 0,
      votesCount: updatedTarget.votesCount,
    };
  }
}

import { Model } from 'mongoose';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Answer } from '../schemas/answer.schema';
import { Question } from '../schemas/question.schema';
import {
  IRealtimeEvents,
  IActivityEventService,
  INotificationService,
} from '../interfaces/external-services.interface';
import {
  PopulatedAnswer,
  PopulatedQuestion,
} from '../interfaces/populated.types';

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

@Injectable()
export class AnswerService {
  constructor(
    @InjectModel(Answer.name) private answerModel: Model<Answer>,
    @InjectModel(Question.name) private questionModel: Model<Question>,
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

  async create(data: {
    body: string;
    author: string;
    question: string;
    isFromAI?: boolean;
  }) {
    const question = await this.questionModel
      .findById(data.question)
      .lean<PopulatedQuestion>();
    if (!question) throw new NotFoundException('Question not found');

    const answer = await this.answerModel.create(data);
    await this.questionModel.findByIdAndUpdate(answer.question, {
      $inc: { answersCount: 1 },
    });

    const populated = await this.answerModel
      .findById(answer._id)
      .populate('author')
      .lean<PopulatedAnswer>();

    if (!populated) throw new Error('Failed to retrieve created answer');

    this.realtimeEvents?.emitAnswerCreated(
      answer.question.toString(),
      populated,
    );

    await this.activityEventService?.recordAnswerCreated({
      userId: populated.author?._id ?? populated.author,
      answerId: populated._id,
      questionId: question._id,
      courseId: question.course
        ? typeof question.course === 'object' && '_id' in question.course
          ? String(question.course._id)
          : String(question.course)
        : null,
      occurredAt: populated.createdAt,
      roleSnapshot: populated.author?.role?.name ?? null,
    });

    await this.notificationService?.notifyQuestionAnswered({
      questionId: question._id,
      answerId: populated._id,
      actorId: populated.author?._id ?? populated.author,
    });

    return populated;
  }

  async findById(id: string) {
    return this.answerModel.findById(id).populate('author');
  }

  async update(id: string, data: { body?: string }) {
    return this.answerModel
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate('author');
  }

  async delete(id: string) {
    const answer = await this.answerModel.findByIdAndDelete(id);
    if (answer?.question) {
      await this.questionModel.findByIdAndUpdate(answer.question, {
        $inc: { answersCount: -1 },
      });
    }
    return answer;
  }

  async findByQuestion(questionId: string, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const [answers, total] = await Promise.all([
      this.answerModel
        .find({ question: questionId })
        .populate('author')
        .sort({ isAccepted: -1, isPinned: -1, votesCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(l),
      this.answerModel.countDocuments({ question: questionId }),
    ]);
    return {
      answers,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1,
      },
    };
  }

  async findByUser(userId: string, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const [answers, total] = await Promise.all([
      this.answerModel
        .find({ author: userId })
        .select('body')
        .sort({ votesCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      this.answerModel.countDocuments({ author: userId }),
    ]);
    return {
      answers,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1,
      },
    };
  }

  async accept(answerId: string, userId: string, userRole?: string) {
    const answer = await this.answerModel.findById(answerId);
    if (!answer) throw new NotFoundException('Answer not found');

    const question = await this.questionModel.findById(answer.question);
    if (!question) throw new NotFoundException('Question not found');

    const isQuestionAuthor = String(question.author) === String(userId);
    const isModerator =
      userRole &&
      ['admin', 'super admin', 'instructor'].includes(userRole.toLowerCase());

    if (!isQuestionAuthor && !isModerator) {
      throw new ForbiddenException(
        'Only the question author or a moderator can accept an answer',
      );
    }

    await this.answerModel.updateMany(
      { question: answer.question, _id: { $ne: answerId } },
      { $set: { isAccepted: false } },
    );
    answer.isAccepted = true;
    await answer.save();

    await this.activityEventService?.recordAcceptedAnswer({
      userId: answer.author,
      answerId: answer._id,
      questionId: question._id,
      courseId: question.course ? String(question.course) : null,
      occurredAt: new Date(),
    });

    return this.answerModel.findById(answerId).populate('author');
  }
}

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Question } from '../schemas/question.schema';
import { Answer } from '../schemas/answer.schema';
import { Tag } from '../schemas/tag.schema';
import { AnswerService } from './answer.service';
import { User } from '@modules/auth/schemas/user.schema';
import {
  AiServiceResponse,
  AiFormattedResponse,
} from '../interfaces/ai-response.types';
import { PopulatedQuestion, PopulatedTag } from '../interfaces/populated.types';

@Injectable()
export class ChatbotService {
  private readonly aiServiceUrl: string;
  private readonly aiTimeout: number;

  constructor(
    private httpService: HttpService,
    @InjectModel(Question.name) private questionModel: Model<Question>,
    @InjectModel(Answer.name) private answerModel: Model<Answer>,
    @InjectModel(Tag.name) private tagModel: Model<Tag>,
    @InjectModel(User.name) private userModel: Model<User>,
    private answerService: AnswerService,
  ) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || '';
    this.aiTimeout = Number(process.env.AI_TIMEOUT) || 300000;
  }

  private async callAIService(
    question: string,
    retryCount = 0,
  ): Promise<AiFormattedResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AiServiceResponse>(
          this.aiServiceUrl,
          { question },
          { timeout: this.aiTimeout },
        ),
      );

      const body = response.data;
      if (body.type === 'refused') {
        throw new Error(
          'The question is too vague and does not specify a context related to computer science.',
        );
      }
      if (
        !body?.data?.hints ||
        !body?.data?.answer ||
        !body?.data?.tags?.length
      ) {
        throw new Error('Invalid AI service response format');
      }

      const formatted: AiFormattedResponse = {
        question,
        hints: body.data.hints,
        finalAnswer: body.data.answer,
        tags: body.data.tags,
        xai: body.data.xai ?? null,
      };
      if (body.type === 'community_match' && body.data.question_id) {
        formatted.communityQuestion = body.data.question_id;
      }
      return formatted;
    } catch (error: unknown) {
      const axiosErr = error as {
        code?: string;
        response?: { status?: number };
        message?: string;
      };
      if (axiosErr.code === 'ECONNABORTED') {
        throw new HttpException(
          'AI service took too long to respond.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      if (retryCount === 0 && axiosErr.code === 'ECONNREFUSED') {
        return this.callAIService(question, retryCount + 1);
      }
      if (axiosErr.response?.status === 500) {
        throw new HttpException(
          'AI service is currently unavailable.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (axiosErr.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Cannot connect to AI service.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException(
        axiosErr.message ?? 'AI service error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  validateQuestion(question: string): string {
    if (!question || typeof question !== 'string') {
      throw new HttpException(
        'Question must be a non-empty string',
        HttpStatus.BAD_REQUEST,
      );
    }
    const trimmed = question.trim();
    if (trimmed.length < 10) {
      throw new HttpException(
        'Question must be at least 10 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (trimmed.length > 1000) {
      throw new HttpException(
        'Question cannot exceed 1000 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  async processChatbotQuestion(question: string): Promise<AiFormattedResponse> {
    const validated = this.validateQuestion(question);
    return this.callAIService(validated);
  }

  private async getOrCreateAIUser(): Promise<string> {
    const AI_EMAIL = 'ai-assistant@system.local';
    const AI_Account = await this.userModel.findOne({ email: AI_EMAIL }).exec();
    if (!AI_Account) {
      const newAIUser = new this.userModel({
        email: AI_EMAIL,
        name: 'AI Assistant',
        username: 'ai-assistant',
        role: '6a1df56e14be3f4e03378cd0',
      });
      await newAIUser.save();
      return newAIUser._id.toString();
    }
    return AI_Account._id.toString();
  }

  async publishChatbotAnswer(
    userId: string,
    title: string,
    question: string,
    finalAnswer: string,
    tags?: string[],
  ) {
    const aiUserId = await this.getOrCreateAIUser();

    const tagIds: Types.ObjectId[] = [];
    if (tags?.length) {
      for (const tagName of tags) {
        const tag = await this.tagModel.findOne({
          name: { $regex: new RegExp(`^${tagName}$`, 'i') },
        });
        if (tag) tagIds.push(tag._id);
      }
    }
    if (tagIds.length) {
      await this.tagModel.updateMany(
        { _id: { $in: tagIds } },
        { $inc: { usageCount: 1 } },
      );
    }

    const communityQuestion = await this.questionModel.create({
      title,
      body: question,
      author: userId,
      tags: tagIds,
    });

    let aiAnswer: Awaited<ReturnType<AnswerService['create']>>;
    try {
      aiAnswer = await this.answerService.create({
        body: finalAnswer,
        author: aiUserId,
        question: String(communityQuestion._id),
        isFromAI: true,
      });
      if (!aiAnswer) throw new Error('Failed to create AI answer');
    } catch (err) {
      await this.questionModel.findByIdAndDelete(communityQuestion._id);
      throw err;
    }

    const populatedAnswer = await this.answerModel
      .findById(aiAnswer._id)
      .populate('author');
    const populatedQuestion = await this.questionModel
      .findById(communityQuestion._id)
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!populatedQuestion)
      throw new Error('Failed to retrieve published question');

    const questionObj: Omit<PopulatedQuestion, 'tags'> & { tags: string[] } = {
      ...populatedQuestion,
      tags: populatedQuestion.tags
        ? populatedQuestion.tags.map((t: PopulatedTag) => t.name)
        : [],
    };

    return { question: questionObj, answer: populatedAnswer };
  }
}

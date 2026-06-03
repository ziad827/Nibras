import { Injectable } from '@nestjs/common';
import { PointsEngineService } from './points-engine.service';
import { ActivityType, ActivitySource } from '../enums/gamification.enums';

@Injectable()
export class ActivityEventService {
  constructor(private readonly pointsEngine: PointsEngineService) {}

  async recordQuestionCreated(data: {
    userId: string;
    questionId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void> {
    await this.pointsEngine.award({
      userId: data.userId,
      activityType: ActivityType.QuestionCreated,
      source: ActivitySource.Community,
      resourceId: data.questionId,
      resourceType: 'Question',
      dedupeKey: `question_created:${data.questionId}`,
      occurredAt: data.occurredAt,
      courseId: data.courseId,
    });
  }

  async recordAnswerCreated(data: {
    userId: string;
    answerId: string;
    questionId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void> {
    await this.pointsEngine.award({
      userId: data.userId,
      activityType: ActivityType.AnswerCreated,
      source: ActivitySource.Community,
      resourceId: data.answerId,
      resourceType: 'Answer',
      dedupeKey: `answer_created:${data.answerId}`,
      occurredAt: data.occurredAt,
      courseId: data.courseId,
    });
  }

  async recordThreadCreated(data: {
    userId: string;
    threadId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void> {
    await this.pointsEngine.award({
      userId: data.userId,
      activityType: ActivityType.ThreadCreated,
      source: ActivitySource.Community,
      resourceId: data.threadId,
      resourceType: 'Thread',
      dedupeKey: `thread_created:${data.threadId}`,
      occurredAt: data.occurredAt,
      courseId: data.courseId,
    });
  }

  async recordAcceptedAnswer(data: {
    userId: string;
    answerId: string;
    questionId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void> {
    await this.pointsEngine.award({
      userId: data.userId,
      activityType: ActivityType.AcceptedAnswer,
      source: ActivitySource.Community,
      resourceId: data.answerId,
      resourceType: 'Answer',
      dedupeKey: `accepted_answer:${data.answerId}`,
      occurredAt: data.occurredAt,
      courseId: data.courseId,
    });
  }

  async recordVoteReward(data: {
    userId: string;
    voterId: string;
    targetType: string;
    targetId: string;
    questionId?: string;
    answerId?: string;
    threadId?: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void> {
    await this.pointsEngine.awardFromVote({
      userId: data.userId,
      voterId: data.voterId,
      targetType: data.targetType,
      targetId: data.targetId,
      questionId: data.questionId,
      answerId: data.answerId,
      courseId: data.courseId,
      occurredAt: data.occurredAt,
    });
  }
}

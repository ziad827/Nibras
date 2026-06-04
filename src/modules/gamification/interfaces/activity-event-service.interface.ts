export interface IActivityEventService {
  recordQuestionCreated(data: {
    userId: string;
    questionId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void>;

  recordAnswerCreated(data: {
    userId: string;
    answerId: string;
    questionId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void>;

  recordThreadCreated(data: {
    userId: string;
    threadId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void>;

  recordAcceptedAnswer(data: {
    userId: string;
    answerId: string;
    questionId: string;
    courseId?: string;
    occurredAt?: Date;
    roleSnapshot?: string;
  }): Promise<void>;

  recordVoteReward(data: {
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
  }): Promise<void>;
}

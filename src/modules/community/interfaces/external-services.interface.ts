import { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  name?: string;
  avatar?: string;
  role?: { name?: string; _id?: Types.ObjectId } | string;
  enrolledCourses?: { course: Types.ObjectId; enrolledAt: Date }[];
}

export interface IVotePayload {
  targetId: string;
  targetType: string;
  votesCount: number;
}

export interface IRealtimeEvents {
  emitThreadCreated(data: unknown): void;
  emitPostCreated(threadId: string, data: unknown): void;
  emitQuestionCreated(data: unknown): void;
  emitAnswerCreated(questionId: string, data: unknown): void;
  emitVoteUpdated(roomId: string, payload: IVotePayload): void;
  emitVoteUpdatedForThread(roomId: string, payload: IVotePayload): void;
}

export interface IActivityEventService {
  recordQuestionCreated(data: unknown): Promise<void>;
  recordAnswerCreated(data: unknown): Promise<void>;
  recordThreadCreated(data: unknown): Promise<void>;
  recordAcceptedAnswer(data: unknown): Promise<void>;
  recordVoteReward(data: unknown): Promise<void>;
}

export interface INotificationService {
  notifyQuestionAnswered(data: unknown): Promise<void>;
  notifyVote(data: unknown): Promise<void>;
}

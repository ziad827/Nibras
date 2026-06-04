import { Injectable } from '@nestjs/common';
import type {
  IActivityEventService,
  INotificationService,
} from '../interfaces/external-services.interface';

@Injectable()
export class NoopActivityEventService implements IActivityEventService {
  recordQuestionCreated(): Promise<void> {
    return Promise.resolve();
  }
  recordAnswerCreated(): Promise<void> {
    return Promise.resolve();
  }
  recordThreadCreated(): Promise<void> {
    return Promise.resolve();
  }
  recordAcceptedAnswer(): Promise<void> {
    return Promise.resolve();
  }
  recordVoteReward(): Promise<void> {
    return Promise.resolve();
  }
}

@Injectable()
export class NoopNotificationService implements INotificationService {
  notifyQuestionAnswered(): Promise<void> {
    return Promise.resolve();
  }
  notifyVote(): Promise<void> {
    return Promise.resolve();
  }
}

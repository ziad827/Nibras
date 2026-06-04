import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type {
  IRealtimeEvents,
  IVotePayload,
} from '../interfaces/external-services.interface';

@WebSocketGateway({ namespace: '/community', cors: { origin: '*' } })
export class CommunityGateway implements IRealtimeEvents {
  @WebSocketServer()
  server!: Server;

  afterInit(): void {
    this.server.on('connection', (client: Socket) => {
      client.on('join', (roomId: string) => {
        void client.join(roomId);
      });
      client.on('leave', (roomId: string) => {
        void client.leave(roomId);
      });
    });
  }

  emitThreadCreated(data: unknown): void {
    this.server?.emit('thread:created', data);
  }

  emitPostCreated(threadId: string, data: unknown): void {
    this.server?.to(`thread:${threadId}`).emit('post:created', data);
  }

  emitQuestionCreated(data: unknown): void {
    this.server?.emit('question:created', data);
  }

  emitAnswerCreated(questionId: string, data: unknown): void {
    this.server?.to(`question:${questionId}`).emit('answer:created', data);
  }

  emitVoteUpdated(roomId: string, payload: IVotePayload): void {
    this.server?.to(`question:${roomId}`).emit('vote:updated', payload);
  }

  emitVoteUpdatedForThread(roomId: string, payload: IVotePayload): void {
    this.server?.to(`thread:${roomId}`).emit('vote:updated', payload);
  }
}

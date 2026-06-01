import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { ContestStandingsResult } from '../services/standings.service';

@WebSocketGateway({ namespace: '/contests', cors: { origin: '*' } })
export class ContestsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join-contest')
  handleJoinContest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { contestId?: string },
  ): { joined: boolean; contestId?: string } {
    const contestId = payload?.contestId?.trim();
    if (!contestId) return { joined: false };
    void client.join(`contest:${contestId}`);
    return { joined: true, contestId };
  }

  emitStandings(contestId: string, standings: ContestStandingsResult): void {
    const payload = {
      contestId,
      standings,
      updatedAt: new Date().toISOString(),
    };
    this.server?.to(`contest:${contestId}`).emit('contest-standings', payload);
  }
}

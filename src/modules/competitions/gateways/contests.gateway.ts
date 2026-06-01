import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { StandingEntry } from '../services/standings.service';

@WebSocketGateway({ namespace: '/contests', cors: { origin: '*' } })
export class ContestsGateway {
  @WebSocketServer()
  server!: Server;

  emitStandings(contestId: string, standings: StandingEntry[]): void {
    this.server?.to(`contest:${contestId}`).emit('contest-standings', {
      contestId,
      standings,
      updatedAt: new Date().toISOString(),
    });
    this.server?.emit('contest-standings', {
      contestId,
      standings,
      updatedAt: new Date().toISOString(),
    });
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { RankingService } from '../services/ranking.service';

@ApiTags('ranking')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller('ranking')
@UseGuards(SessionAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  @ApiOperation({ summary: 'Get cached leaderboard' })
  getRanking(@Query() query: Record<string, string>) {
    return this.rankingService.getRanking(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'My ranking positions' })
  getMyRanking(@CurrentUser() user: AuthenticatedUser) {
    return this.rankingService.getMyRanking(user.id);
  }
}

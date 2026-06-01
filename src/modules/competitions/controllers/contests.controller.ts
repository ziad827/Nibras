import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '@common/decorators/auth.decorators';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { OptionalSessionGuard } from '@common/guards/optional-session.guard';
import { RolesGuard, SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import {
  ContestReminderDto,
  CreateContestDto,
  ToggleDto,
  UpdateContestDto,
} from '../dto/competitions.dto';
import { ContestsService } from '../services/contests.service';
import { LinkedAccountsService } from '../services/linked-accounts.service';

@ApiTags('contests')
@Controller('contests')
export class ContestsController {
  constructor(
    private readonly contestsService: ContestsService,
    private readonly linkedAccountsService: LinkedAccountsService,
  ) {}

  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'List contests' })
  async list(
    @Query() query: Record<string, string>,
    @CurrentUser() user?: AuthenticatedUser,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.contestsService.listContests(query, user?.id);
    res?.setHeader('x-total-count', String(result.total));
    return result.items;
  }

  @Get('calendar')
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'Calendar view' })
  calendar(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.contestsService.getCalendar(month, year, user?.id);
  }

  @Get('history')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  @ApiOperation({ summary: 'My contest history' })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('host') host?: string,
  ) {
    return this.contestsService.getHistory(user.id, host);
  }

  @Get('accounts')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  @ApiOperation({ summary: 'List linked competition accounts (alias)' })
  accounts(@CurrentUser() user: AuthenticatedUser) {
    return this.linkedAccountsService.listForUser(user.id);
  }

  @Post('user-contests/:contestId/reminder')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  setReminder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contestId') contestId: string,
    @Body() body: ContestReminderDto,
  ) {
    return this.contestsService.setReminder(
      user.id,
      contestId,
      body.on,
      body.minutesBefore,
    );
  }

  @Post('user-contests/:contestId/bookmark')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  setBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contestId') contestId: string,
    @Body() body: ToggleDto,
  ) {
    return this.contestsService.setBookmark(user.id, contestId, body.on);
  }

  @Post()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('instructor', 'admin', 'super-admin')
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  @ApiOperation({ summary: 'Create internal contest' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContestDto,
  ) {
    return this.contestsService.createInternalContest(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Contest details with standings' })
  getOne(@Param('id') id: string) {
    return this.contestsService.getContestDetail(id);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('instructor', 'admin', 'super-admin')
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  update(@Param('id') id: string, @Body() dto: UpdateContestDto) {
    return this.contestsService.updateContest(id, dto);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('instructor', 'admin', 'super-admin')
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  archive(@Param('id') id: string) {
    return this.contestsService.archiveContest(id);
  }

  @Post(':id/register')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth('session')
  @ApiCookieAuth('nibras_web_session')
  register(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contestsService.registerForContest(user.id, id);
  }
}

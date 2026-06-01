import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CreateTeamDto, SubmitSolutionDto } from '../dto/competitions.dto';
import { SubmissionsService } from '../services/submissions.service';
import { TeamsService } from '../services/teams.service';

@ApiTags('contests')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller('contests')
@UseGuards(SessionAuthGuard)
export class ContestActionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly teamsService: TeamsService,
  ) {}

  @Post(':id/submissions')
  @ApiOperation({ summary: 'Submit solution during contest' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contestId: string,
    @Body() dto: SubmitSolutionDto,
  ) {
    return this.submissionsService.submitSolution(user.id, contestId, dto);
  }

  @Post(':id/teams')
  @ApiOperation({ summary: 'Form contest team' })
  createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') contestId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(user.id, contestId, dto);
  }
}

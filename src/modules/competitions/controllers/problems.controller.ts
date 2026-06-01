import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { ToggleDto } from '../dto/competitions.dto';
import { ProblemsService } from '../services/problems.service';

@ApiTags('problems')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller('problems')
@UseGuards(SessionAuthGuard)
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Get()
  @ApiOperation({ summary: 'List practice problems' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    return this.problemsService.listProblems(user.id, query);
  }

  @Post(':problemId/bookmark')
  @ApiOperation({ summary: 'Bookmark problem' })
  bookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('problemId') problemId: string,
    @Body() body: ToggleDto,
  ) {
    return this.problemsService.setBookmark(user.id, problemId, body.on);
  }
}

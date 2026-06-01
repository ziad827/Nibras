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
import { Roles } from '@common/decorators/auth.decorators';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RolesGuard, SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CreateProblemDto, ToggleDto } from '../dto/competitions.dto';
import { ProblemsService } from '../services/problems.service';

@ApiTags('problems')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller('problems')
@UseGuards(SessionAuthGuard)
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('instructor', 'admin', 'super-admin')
  @ApiOperation({ summary: 'Create internal practice problem' })
  create(@Body() dto: CreateProblemDto) {
    return this.problemsService.createInternalProblem(dto);
  }

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

import {
  BadGatewayException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { OptionalSessionGuard } from '@common/guards/optional-session.guard';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CodeforcesPracticeService } from '../practice/codeforces-practice.service';
import { LeetcodePracticeService } from '../practice/leetcode-practice.service';

@ApiTags('practice')
@Controller('practice')
export class PracticeController {
  constructor(
    private readonly cfPractice: CodeforcesPracticeService,
    private readonly lcPractice: LeetcodePracticeService,
  ) {}

  @Get('codeforces/problems')
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'Codeforces practice problems' })
  async cfProblems(
    @CurrentUser() user?: AuthenticatedUser,
    @Query() q?: Record<string, string>,
  ) {
    try {
      const handle = await this.cfPractice.resolveHandle(user?.id, q?.handle);
      return this.cfPractice.fetchProblems(handle, {
        page: q?.page ? parseInt(q.page, 10) : 1,
        limit: q?.limit ? parseInt(q.limit, 10) : 100,
        q: q?.q,
        tag: q?.tag,
        ratingMin: q?.ratingMin ? parseInt(q.ratingMin, 10) : undefined,
        ratingMax: q?.ratingMax ? parseInt(q.ratingMax, 10) : undefined,
        solved: q?.solved as 'true' | 'false' | undefined,
      });
    } catch (err) {
      throw new BadGatewayException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  @Get('codeforces/analytics')
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'Codeforces analytics' })
  async cfAnalytics(
    @CurrentUser() user?: AuthenticatedUser,
    @Query('handle') queryHandle?: string,
  ) {
    const handle = await this.cfPractice.resolveHandle(user?.id, queryHandle);
    if (!handle) {
      throw new BadGatewayException('Codeforces handle required');
    }
    try {
      return this.cfPractice.fetchAnalytics(handle);
    } catch (err) {
      throw new BadGatewayException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  @Get('leetcode/problems')
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'LeetCode practice problems' })
  async lcProblems(
    @CurrentUser() user?: AuthenticatedUser,
    @Query() q?: Record<string, string>,
  ) {
    try {
      const handle = await this.lcPractice.resolveHandle(user?.id, q?.handle);
      return this.lcPractice.fetchProblems(handle, {
        page: q?.page ? parseInt(q.page, 10) : 1,
        limit: q?.limit ? parseInt(q.limit, 10) : 100,
        q: q?.q,
        solved: q?.solved as 'true' | 'false' | undefined,
      });
    } catch (err) {
      throw new BadGatewayException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  @Get('leetcode/analytics')
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'LeetCode analytics' })
  async lcAnalytics(
    @CurrentUser() user?: AuthenticatedUser,
    @Query('handle') queryHandle?: string,
  ) {
    const handle = await this.lcPractice.resolveHandle(user?.id, queryHandle);
    if (!handle) {
      throw new BadGatewayException('LeetCode handle required');
    }
    try {
      return this.lcPractice.fetchAnalytics(handle);
    } catch (err) {
      throw new BadGatewayException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

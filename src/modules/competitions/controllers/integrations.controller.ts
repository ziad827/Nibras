import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import {
  PLATFORM_CATEGORIES,
  PLATFORM_INTEGRATIONS,
} from '../constants/platform-integrations';
import { LinkAccountDto } from '../dto/competitions.dto';
import { LinkedAccountsService } from '../services/linked-accounts.service';

@ApiTags('integrations')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller('integrations')
@UseGuards(SessionAuthGuard)
export class IntegrationsController {
  constructor(private readonly linkedAccounts: LinkedAccountsService) {}

  @Get('platforms')
  @ApiOperation({ summary: 'Platform integration catalog' })
  platforms() {
    return {
      categories: PLATFORM_CATEGORIES,
      integrations: PLATFORM_INTEGRATIONS,
    };
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List linked accounts' })
  accounts(@CurrentUser() user: AuthenticatedUser) {
    return this.linkedAccounts.listForUser(user.id);
  }

  @Post('codeforces/connect')
  @ApiOperation({ summary: 'Link Codeforces account' })
  connectCodeforces(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Omit<LinkAccountDto, 'platform'>,
  ) {
    return this.linkedAccounts.linkAccount(user.id, 'codeforces', body.handle);
  }

  @Post('leetcode/connect')
  @ApiOperation({ summary: 'Link LeetCode account' })
  connectLeetcode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Omit<LinkAccountDto, 'platform'>,
  ) {
    return this.linkedAccounts.linkAccount(user.id, 'leetcode', body.handle);
  }

  @Post('hackerrank/connect')
  @ApiOperation({ summary: 'Link HackerRank account' })
  connectHackerrank(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Omit<LinkAccountDto, 'platform'>,
  ) {
    return this.linkedAccounts.linkAccount(user.id, 'hackerrank', body.handle);
  }

  @Post('accounts/:host/verify')
  @ApiOperation({ summary: 'Verify linked account' })
  verify(@CurrentUser() user: AuthenticatedUser, @Param('host') host: string) {
    return this.linkedAccounts.verifyAccount(user.id, host);
  }

  @Post('accounts/:host/resync')
  @ApiOperation({ summary: 'Resync linked account' })
  resync(@CurrentUser() user: AuthenticatedUser, @Param('host') host: string) {
    return this.linkedAccounts.triggerResync(user.id, host);
  }

  @Delete('accounts/:host')
  @ApiOperation({ summary: 'Unlink account' })
  unlink(@CurrentUser() user: AuthenticatedUser, @Param('host') host: string) {
    return this.linkedAccounts.unlinkAccount(user.id, host);
  }
}

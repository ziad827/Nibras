import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { ReputationService } from '../services/reputation.service';
import { BadgeEvaluationService } from '../services/badge-evaluation.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { LeaderboardQueryDto } from '../dto/leaderboard-query.dto';
import { UpdatePrivacyDto } from '../dto/update-privacy.dto';
import { User } from '@modules/auth/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaderboardType } from '../enums/gamification.enums';
import type { BadgeProgressInfo } from '../interfaces/badge-progress.interface';

@ApiTags('Gamification')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@UseGuards(SessionAuthGuard)
@Controller()
export class GamificationController {
  constructor(
    private readonly reputationService: ReputationService,
    private readonly badgeEvaluationService: BadgeEvaluationService,
    private readonly leaderboardService: LeaderboardService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Get('gamification/my-stats')
  @ApiOperation({
    summary: 'Get my gamification stats: reputation, badges, ranks',
  })
  async getMyStats(@CurrentUser() user: AuthenticatedUser) {
    const reputation = await this.reputationService.getReputationBreakdown(
      user.id,
    );
    const badges = await this.badgeEvaluationService.getAllBadgesWithProgress(
      user.id,
    );
    const totalBadgesEarned = (badges as BadgeProgressInfo[]).filter(
      (b) => b.earned,
    ).length;

    const leaderboardTypes = [
      LeaderboardType.Academic,
      LeaderboardType.Competitive,
      LeaderboardType.Community,
    ];
    const leaderboardRanks = await Promise.all(
      leaderboardTypes.map(async (type) => {
        const { rank, score } = await this.leaderboardService.getUserRank(
          type,
          user.id,
        );
        return { type, rank, score };
      }),
    );

    return {
      success: true,
      message: 'Gamification stats fetched successfully',
      data: {
        reputation,
        badges,
        totalBadgesEarned,
        leaderboardRanks,
        totalPoints: reputation.total,
      },
    };
  }

  @Get('badges')
  @ApiOperation({ summary: 'List all badges with per-user progress' })
  async getAllBadges(@CurrentUser() user: AuthenticatedUser) {
    const badges = await this.badgeEvaluationService.getAllBadgesWithProgress(
      user.id,
    );
    return {
      success: true,
      message: 'Badges fetched successfully',
      data: badges,
    };
  }

  @Get('leaderboards')
  @ApiOperation({ summary: 'Get leaderboard entries for a specific type' })
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const type = query.type || LeaderboardType.Community;
    const limit = query.limit || 20;

    const [entries, myRank] = await Promise.all([
      this.leaderboardService.getTopUsers(type, limit, true),
      this.leaderboardService.getUserRank(type, user.id),
    ]);

    return {
      success: true,
      message: 'Leaderboard fetched successfully',
      data: {
        type,
        entries,
        currentUser: myRank,
      },
    };
  }

  @Get('leaderboards/me')
  @ApiOperation({ summary: 'Get my rank across all leaderboards' })
  async getMyLeaderboardRanks(@CurrentUser() user: AuthenticatedUser) {
    const types = [
      LeaderboardType.Academic,
      LeaderboardType.Competitive,
      LeaderboardType.Community,
    ];
    const ranks = await Promise.all(
      types.map(async (type) => {
        const { rank, score } = await this.leaderboardService.getUserRank(
          type,
          user.id,
        );
        return { type, rank, score };
      }),
    );

    return {
      success: true,
      message: 'Leaderboard ranks fetched successfully',
      data: ranks,
    };
  }

  @Get('leaderboards/config')
  @ApiOperation({ summary: 'Get scoring legend/config' })
  getLeaderboardConfig() {
    return {
      success: true,
      message: 'Leaderboard config fetched successfully',
      data: {
        scoring: this.leaderboardService.getScoringLegend(),
      },
    };
  }

  @Patch('users/me/privacy')
  @ApiOperation({ summary: 'Update leaderboard privacy settings' })
  async updatePrivacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePrivacyDto,
  ) {
    await this.userModel.findByIdAndUpdate(user.id, {
      'privacySettings.showOnLeaderboard': dto.showOnLeaderboard,
    });

    return {
      success: true,
      message: dto.showOnLeaderboard
        ? 'You are now visible on leaderboards'
        : 'You are now hidden from public leaderboards',
    };
  }
}

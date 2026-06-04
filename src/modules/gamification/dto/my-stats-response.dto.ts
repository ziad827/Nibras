import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReputationBreakdown {
  @ApiProperty() problem!: number;
  @ApiProperty() community!: number;
  @ApiProperty() contest!: number;
  @ApiProperty() course!: number;
}

class ReputationDto {
  @ApiProperty() total!: number;
  @ApiProperty() breakdown!: ReputationBreakdown;
}

class BadgeInfo {
  @ApiProperty() _id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() type!: string;
  @ApiPropertyOptional() icon?: string;
  @ApiProperty() pointsValue!: number;
  @ApiProperty() level!: string;
  @ApiProperty() earned!: boolean;
  @ApiPropertyOptional() earnedAt?: Date;
}

class LeaderboardRankInfo {
  @ApiProperty() type!: string;
  @ApiProperty() rank!: number | null;
  @ApiProperty() score!: number;
}

export class MyStatsResponseDto {
  @ApiProperty() reputation!: ReputationDto;
  @ApiProperty({ type: [BadgeInfo] }) badges!: BadgeInfo[];
  @ApiProperty() totalBadgesEarned!: number;
  @ApiProperty({ type: [LeaderboardRankInfo] })
  leaderboardRanks!: LeaderboardRankInfo[];
  @ApiProperty() totalPoints!: number;
}

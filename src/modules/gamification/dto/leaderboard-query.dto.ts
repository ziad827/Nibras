import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeaderboardType } from '../enums/gamification.enums';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    enum: LeaderboardType,
    default: LeaderboardType.Community,
  })
  @IsEnum(LeaderboardType)
  @IsOptional()
  type?: LeaderboardType;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

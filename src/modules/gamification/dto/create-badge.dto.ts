import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeType, BadgeLevel } from '../enums/gamification.enums';

export class CreateBadgeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ enum: BadgeType })
  @IsEnum(BadgeType)
  type!: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  criteria?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty()
  @IsNumber()
  pointsValue!: number;

  @ApiProperty({ enum: BadgeLevel, default: BadgeLevel.Bronze })
  @IsEnum(BadgeLevel)
  @IsOptional()
  level?: string;
}

export class UpdateBadgeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: BadgeType })
  @IsEnum(BadgeType)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  criteria?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  pointsValue?: number;

  @ApiPropertyOptional({ enum: BadgeLevel })
  @IsEnum(BadgeLevel)
  @IsOptional()
  level?: string;
}

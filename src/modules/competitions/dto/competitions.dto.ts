import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ScoringMode } from '../enums/competition.enums';

export class ToggleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  on?: boolean;
}

export class ContestReminderDto extends ToggleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minutesBefore?: number;
}

export class LinkAccountDto {
  @ApiProperty()
  @IsString()
  platform!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  handle!: string;
}

export class CreateContestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTeamBased?: boolean;

  @ApiPropertyOptional({ enum: ScoringMode })
  @IsOptional()
  @IsEnum(ScoringMode)
  scoringMode?: ScoringMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  problemIds?: string[];
}

export class UpdateContestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTeamBased?: boolean;

  @ApiPropertyOptional({ enum: ScoringMode })
  @IsOptional()
  @IsEnum(ScoringMode)
  scoringMode?: ScoringMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  problemIds?: string[];
}

export class SubmitSolutionDto {
  @ApiProperty()
  @IsString()
  problemId!: string;

  @ApiProperty()
  @IsString()
  language!: string;

  @ApiProperty()
  @IsString()
  code!: string;
}

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  memberIds!: string[];
}

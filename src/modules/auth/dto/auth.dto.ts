import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'student@university.edu' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '/dashboard' })
  @IsOptional()
  @IsString()
  next?: string;
}

export class AuthProvidersResponseDto {
  @ApiProperty()
  github!: boolean;

  @ApiProperty()
  magicLink!: boolean;
}

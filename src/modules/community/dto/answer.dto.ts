import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class UpdateAnswerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  body?: string;
}

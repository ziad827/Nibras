import { IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['question', 'answer', 'thread', 'post'])
  targetType!: string;

  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @IsNumber()
  @IsIn([1, -1])
  value!: number;
}

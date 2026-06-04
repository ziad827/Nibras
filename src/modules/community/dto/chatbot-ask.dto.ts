import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ChatbotAskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10000)
  question!: string;
}

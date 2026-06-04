import { IsOptional, IsBoolean } from 'class-validator';

export class ToggleBookmarkDto {
  @IsOptional()
  @IsBoolean()
  on?: boolean;
}

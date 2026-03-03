import { PartialType } from '@nestjs/mapped-types';
import { CreateColorDto } from './create-color.dto';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateColorDto extends PartialType(CreateColorDto) {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  colorStatus?: number;
}

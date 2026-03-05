import { PartialType } from '@nestjs/mapped-types';
import { CreateColorDto } from './create-color.dto';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateColorDto extends PartialType(CreateColorDto) {
  @IsOptional()
  colorStatus?: boolean;

  @IsOptional()
  imageIds?: string;
}

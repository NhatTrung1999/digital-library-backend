import { PartialType } from '@nestjs/mapped-types';
import { CreateHighAbrasionDto } from './create-high-abrasion.dto';
import { IsOptional } from 'class-validator';

export class UpdateHighAbrasionDto extends PartialType(CreateHighAbrasionDto) {
  @IsOptional()
  imageIds?: string;
}

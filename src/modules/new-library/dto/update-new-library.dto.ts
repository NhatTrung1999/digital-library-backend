import { PartialType } from '@nestjs/mapped-types';
import { CreateNewLibraryDto } from './create-new-library.dto';
import { IsOptional } from 'class-validator';

export class UpdateNewLibraryDto extends PartialType(CreateNewLibraryDto) {
  @IsOptional()
  imageIds?: string;
}

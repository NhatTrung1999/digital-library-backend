import { PartialType } from '@nestjs/mapped-types';
import { CreateNewLibraryDto } from './create-new-library.dto';

export class UpdateNewLibraryDto extends PartialType(CreateNewLibraryDto) {}

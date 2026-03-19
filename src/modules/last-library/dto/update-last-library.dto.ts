import { PartialType } from '@nestjs/mapped-types';
import { CreateLastLibraryDto } from './create-last-library.dto';

export class UpdateLastLibraryDto extends PartialType(CreateLastLibraryDto) {}

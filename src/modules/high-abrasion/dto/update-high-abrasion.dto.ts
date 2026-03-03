import { PartialType } from '@nestjs/mapped-types';
import { CreateHighAbrasionDto } from './create-high-abrasion.dto';

export class UpdateHighAbrasionDto extends PartialType(CreateHighAbrasionDto) {}

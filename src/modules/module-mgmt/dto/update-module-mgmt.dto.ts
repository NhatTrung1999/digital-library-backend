import { PartialType } from '@nestjs/mapped-types';
import { CreateModuleMgmtDto } from './create-module-mgmt.dto';
import { IsOptional } from 'class-validator';

export class UpdateModuleMgmtDto extends PartialType(CreateModuleMgmtDto) {
  @IsOptional()
  Status?: boolean;
}

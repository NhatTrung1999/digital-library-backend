import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuMgmtDto } from './create-menu-mgmt.dto';
import { IsOptional } from 'class-validator';

export class UpdateMenuMgmtDto extends PartialType(CreateMenuMgmtDto) {
  @IsOptional()
  Status?: boolean;
}

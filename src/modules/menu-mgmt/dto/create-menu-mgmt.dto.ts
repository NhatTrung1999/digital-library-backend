import { IsOptional } from 'class-validator';

export class CreateMenuMgmtDto {
  @IsOptional()
  ModuleID: string;
  @IsOptional()
  Name_EN: string;
  @IsOptional()
  Name_VN: string;
  @IsOptional()
  Name_CN: string;
}

import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  Username: string;

  @MinLength(4)
  Password: string;

  @IsOptional()
  Email?: string;

  @IsOptional()
  FullName?: string;

  @IsOptional()
  VendorCode?: string;

  @IsOptional()
  LevelPermission?: string;

  @IsOptional()
  Factory?: string;
}

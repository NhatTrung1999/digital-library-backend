import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  username: string;

  @MinLength(4)
  password: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  fullName?: string;

  @IsOptional()
  vendorCode?: string;
}

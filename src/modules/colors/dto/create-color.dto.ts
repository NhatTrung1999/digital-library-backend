import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateColorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  colorName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  colorCode: string;

  @IsOptional()
  @IsString()
  rgbValue?: string;

  @IsOptional()
  @IsString()
  cmykValue?: string;

//   @IsOptional()
//   @IsString()
//   reference?: string;

  @IsOptional()
  @IsString()
  colorGroup?: string;

//   @IsOptional()
//   @IsString()
//   thumbnail?: string;
}

import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  perDayPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  flatPrice?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

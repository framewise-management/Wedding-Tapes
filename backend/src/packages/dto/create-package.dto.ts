import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price: number;
}

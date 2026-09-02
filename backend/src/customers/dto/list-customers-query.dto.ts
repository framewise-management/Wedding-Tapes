import { IsOptional, IsString } from 'class-validator';

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

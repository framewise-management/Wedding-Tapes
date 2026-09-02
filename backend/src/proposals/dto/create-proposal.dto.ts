import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DiscountType } from '../entities/proposal.entity';

export class DiscountInputDto {
  @IsEnum(DiscountType)
  type: DiscountType;

  @IsInt()
  @Min(0)
  value: number;
}

export class ProposalPackageInputDto {
  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class ProposalItemInputDto {
  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsIn(['per_day', 'flat'])
  priceType?: 'per_day' | 'flat';

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean = false;
}

export class CreateProposalDto {
  @IsUUID()
  customerId: string;

  @IsDateString()
  weddingDate: string;

  @IsString()
  @MinLength(1)
  weddingLocation: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalPackageInputDto)
  packages?: ProposalPackageInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalItemInputDto)
  items?: ProposalItemInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountInputDto)
  discount?: DiscountInputDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxRate?: number;
}

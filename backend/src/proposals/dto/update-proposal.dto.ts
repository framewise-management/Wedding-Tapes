import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DiscountInputDto,
  ProposalItemInputDto,
  ProposalPackageInputDto,
} from './create-proposal.dto';

export class UpdateProposalDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  weddingDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  weddingLocation?: string;

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

  /** Omit to leave the discount untouched; pass `null` to clear it. */
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountInputDto)
  discount?: DiscountInputDto | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxRate?: number;
}

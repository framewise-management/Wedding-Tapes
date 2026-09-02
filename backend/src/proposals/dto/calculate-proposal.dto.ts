import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { DiscountInputDto } from './create-proposal.dto.js';

export class CalculateProposalDto {
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

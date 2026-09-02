import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProposalStatus } from '../entities/proposal.entity';

export class ListProposalsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;
}

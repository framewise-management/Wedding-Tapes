import { IsEnum } from 'class-validator';
import { ProposalStatus } from '../entities/proposal.entity.js';

export class UpdateProposalStatusDto {
  @IsEnum(ProposalStatus)
  status: ProposalStatus;
}

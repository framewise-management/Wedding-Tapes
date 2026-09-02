import { IsEnum } from 'class-validator';
import { ProposalStatus } from '../entities/proposal.entity';

export class UpdateProposalStatusDto {
  @IsEnum(ProposalStatus)
  status: ProposalStatus;
}

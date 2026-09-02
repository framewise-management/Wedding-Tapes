import { Business } from '../business/entities/business.entity';
import { Proposal } from '../proposals/entities/proposal.entity';

export const PDF_GENERATOR = Symbol('PDF_GENERATOR');

export interface PdfGenerator {
  generateProposalPdf(proposal: Proposal, business: Business): Promise<Buffer>;
}

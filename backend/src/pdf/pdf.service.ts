import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../business/entities/business.entity';
import { Proposal } from '../proposals/entities/proposal.entity';
import { PDF_GENERATOR } from './pdf-generator.interface';
import type { PdfGenerator } from './pdf-generator.interface';

@Injectable()
export class PdfService {
  constructor(@Inject(PDF_GENERATOR) private readonly generator: PdfGenerator) {}

  generateProposalPdf(proposal: Proposal, business: Business): Promise<Buffer> {
    return this.generator.generateProposalPdf(proposal, business);
  }
}

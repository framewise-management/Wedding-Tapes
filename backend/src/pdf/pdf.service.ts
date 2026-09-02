import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../business/entities/business.entity.js';
import { Proposal } from '../proposals/entities/proposal.entity.js';
import { PDF_GENERATOR } from './pdf-generator.interface.js';
import type { PdfGenerator } from './pdf-generator.interface.js';

@Injectable()
export class PdfService {
  constructor(@Inject(PDF_GENERATOR) private readonly generator: PdfGenerator) {}

  generateProposalPdf(proposal: Proposal, business: Business): Promise<Buffer> {
    return this.generator.generateProposalPdf(proposal, business);
  }
}

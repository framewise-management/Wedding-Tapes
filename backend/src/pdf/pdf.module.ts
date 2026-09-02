import { Module } from '@nestjs/common';
import { PDF_GENERATOR } from './pdf-generator.interface.js';
import { PdfKitProposalPdfGenerator } from './pdfkit-proposal-pdf.generator.js';
import { PdfService } from './pdf.service.js';

@Module({
  providers: [
    { provide: PDF_GENERATOR, useClass: PdfKitProposalPdfGenerator },
    PdfService,
  ],
  exports: [PdfService],
})
export class PdfModule {}

import { Module } from '@nestjs/common';
import { PDF_GENERATOR } from './pdf-generator.interface';
import { PdfKitProposalPdfGenerator } from './pdfkit-proposal-pdf.generator';
import { PdfService } from './pdf.service';

@Module({
  providers: [
    { provide: PDF_GENERATOR, useClass: PdfKitProposalPdfGenerator },
    PdfService,
  ],
  exports: [PdfService],
})
export class PdfModule {}

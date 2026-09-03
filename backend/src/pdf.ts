import PDFDocument from 'pdfkit';
import type { DiscountType } from './db/schema';

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495;
const AMOUNT_X = 410;
const AMOUNT_WIDTH = 135;
const NAME_WIDTH = 345;

// ponytail: pdfkit's standard fonts (Helvetica) only cover WinAnsi, which has no ₹ glyph —
// embedding a Unicode font just for the rupee sign isn't worth it yet, so the PDF spells it out.
function money(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = /^data:.*;base64,(.+)$/.exec(dataUrl);
  return match ? Buffer.from(match[1], 'base64') : null;
}

export interface PdfBusiness {
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  defaultTerms: string | null;
}

export interface PdfProposal {
  proposalNumber: string;
  createdAt: string | Date;
  validUntil: string | null;
  weddingDate: string;
  weddingLocation: string;
  numberOfDays: number | null;
  subtotal: number;
  discountAmount: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  taxRate: number;
  taxAmount: number;
  total: number;
  customer: { name: string; phone: string; email: string | null };
  packages: { packageName: string; packageDescription: string | null; quantity: number; total: number }[];
  items: {
    serviceName: string;
    description: string | null;
    quantity: number;
    total: number;
    isOptional: boolean;
  }[];
}

export async function generateProposalPdf(
  proposal: PdfProposal,
  business: PdfBusiness,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  renderHeader(doc, proposal, business);
  renderCustomer(doc, proposal);
  renderWedding(doc, proposal);
  renderLineItems(
    doc,
    'Selected Packages',
    proposal.packages.map((p) => ({
      name: p.quantity > 1 ? `${p.packageName} x ${p.quantity}` : p.packageName,
      description: p.packageDescription,
      amount: p.total,
    })),
  );
  const includedItems = proposal.items.filter((i) => !i.isOptional);
  const optionalItems = proposal.items.filter((i) => i.isOptional);
  renderLineItems(
    doc,
    'Services',
    includedItems.map((i) => ({
      name: i.quantity > 1 ? `${i.serviceName} x ${i.quantity}` : i.serviceName,
      description: i.description,
      amount: i.total,
    })),
  );
  renderLineItems(
    doc,
    'Optional Services (not included in total)',
    optionalItems.map((i) => ({
      name: i.quantity > 1 ? `${i.serviceName} x ${i.quantity}` : i.serviceName,
      description: i.description,
      amount: i.total,
    })),
  );
  renderPricing(doc, proposal);
  renderTerms(doc, business);
  renderFooter(doc, business);

  doc.end();
  return done;
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(1);
  doc
    .fontSize(11)
    .fillColor('#8b8590')
    .font('Helvetica-Bold')
    .text(title.toUpperCase(), PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.fillColor('#08060d').font('Helvetica').moveDown(0.4);
}

function renderHeader(doc: PDFKit.PDFDocument, proposal: PdfProposal, business: PdfBusiness): void {
  const startY = doc.y;
  const logoBuffer = business.logo ? dataUrlToBuffer(business.logo) : null;
  let textX = PAGE_MARGIN;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, PAGE_MARGIN, startY, { width: 50, height: 50 });
      textX = PAGE_MARGIN + 62;
    } catch {
      // ponytail: an unsupported/corrupt logo shouldn't fail the whole PDF -- just skip it.
    }
  }

  doc.fontSize(16).font('Helvetica-Bold').text(business.name, textX, startY, { width: 280 });
  doc.fontSize(9.5).font('Helvetica').fillColor('#6b6375');
  const contact = [business.phone, business.email, business.website, business.address]
    .filter(Boolean)
    .join('  ·  ');
  if (contact) doc.text(contact, textX, doc.y, { width: 280 });
  doc.fillColor('#08060d');

  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text(proposal.proposalNumber, AMOUNT_X - 100, startY, { width: 235, align: 'right' });
  doc
    .fontSize(9.5)
    .font('Helvetica')
    .fillColor('#6b6375')
    .text(`Date: ${formatDate(proposal.createdAt)}`, AMOUNT_X - 100, doc.y, {
      width: 235,
      align: 'right',
    });
  if (proposal.validUntil) {
    doc.text(`Valid until: ${formatDate(proposal.validUntil)}`, AMOUNT_X - 100, doc.y, {
      width: 235,
      align: 'right',
    });
  }
  doc.fillColor('#08060d');

  doc.x = PAGE_MARGIN;
  doc.y = Math.max(doc.y, startY + 60);
  doc.moveDown(0.6);
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
    .strokeColor('#e5e4e7')
    .stroke();
}

function renderCustomer(doc: PDFKit.PDFDocument, proposal: PdfProposal): void {
  sectionHeading(doc, 'Customer');
  doc.fontSize(11).text(proposal.customer.name, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc
    .fontSize(10)
    .fillColor('#6b6375')
    .text(proposal.customer.phone, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  if (proposal.customer.email) {
    doc.text(proposal.customer.email, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  }
  doc.fillColor('#08060d');
}

function renderWedding(doc: PDFKit.PDFDocument, proposal: PdfProposal): void {
  sectionHeading(doc, 'Wedding Details');
  doc
    .fontSize(11)
    .text(`${formatDate(proposal.weddingDate)} — ${proposal.weddingLocation}`, PAGE_MARGIN, doc.y, {
      width: CONTENT_WIDTH,
    });
  if (proposal.numberOfDays != null) {
    doc
      .fontSize(10)
      .fillColor('#6b6375')
      .text(
        `${proposal.numberOfDays} day${proposal.numberOfDays === 1 ? '' : 's'}`,
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH },
      );
    doc.fillColor('#08060d');
  }
}

function renderLineItems(
  doc: PDFKit.PDFDocument,
  title: string,
  items: { name: string; description: string | null; amount: number }[],
): void {
  if (!items.length) return;
  sectionHeading(doc, title);
  for (const item of items) {
    const startY = doc.y;
    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor('#08060d')
      .text(money(item.amount), AMOUNT_X, startY, {
        width: AMOUNT_WIDTH,
        align: 'right',
        lineBreak: false,
      });

    doc.y = startY;
    doc.fontSize(11).font('Helvetica-Bold').text(item.name, PAGE_MARGIN, startY, { width: NAME_WIDTH });
    if (item.description) {
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#8b8590')
        .text(item.description, PAGE_MARGIN, doc.y, { width: NAME_WIDTH });
      doc.fillColor('#08060d');
    }
    doc.moveDown(0.5);
  }
}

function renderPricing(doc: PDFKit.PDFDocument, proposal: PdfProposal): void {
  sectionHeading(doc, 'Pricing Summary');
  const taxableAmount = proposal.subtotal - proposal.discountAmount;

  const row = (label: string, amount: string, bold = false) => {
    const startY = doc.y;
    doc.fontSize(bold ? 13 : 10.5).font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(amount, AMOUNT_X, startY, { width: AMOUNT_WIDTH, align: 'right', lineBreak: false });
    doc.y = startY;
    doc.text(label, PAGE_MARGIN, startY, { width: NAME_WIDTH });
  };

  row('Subtotal', money(proposal.subtotal));
  if (proposal.discountAmount > 0) {
    const label =
      proposal.discountType === 'PERCENTAGE'
        ? `Discount (${proposal.discountValue}%)`
        : 'Discount';
    row(label, `- ${money(proposal.discountAmount)}`);
    row('Taxable Total', money(taxableAmount));
  }
  if (proposal.taxAmount > 0) {
    row(`Tax (${proposal.taxRate}%)`, `+ ${money(proposal.taxAmount)}`);
  }
  doc
    .moveTo(PAGE_MARGIN, doc.y + 4)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y + 4)
    .strokeColor('#e5e4e7')
    .stroke();
  doc.moveDown(0.6);
  row('Final Total', money(proposal.total), true);
}

function renderTerms(doc: PDFKit.PDFDocument, business: PdfBusiness): void {
  if (!business.defaultTerms) return;
  sectionHeading(doc, 'Terms & Conditions');
  doc
    .fontSize(9.5)
    .fillColor('#6b6375')
    .text(business.defaultTerms, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.fillColor('#08060d');
}

function renderFooter(doc: PDFKit.PDFDocument, business: PdfBusiness): void {
  doc.moveDown(1.5);
  doc
    .fontSize(8.5)
    .fillColor('#8b8590')
    .text(`Generated by ${business.name} on ${formatDate(new Date())}`, PAGE_MARGIN, doc.y, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
}

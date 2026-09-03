import PDFDocument from 'pdfkit';
import type { DiscountType, ProposalTemplate } from './db/schema';

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495;
const AMOUNT_X = 410;
const AMOUNT_WIDTH = 135;
const NAME_WIDTH = 345;
const CARD_PAD = 11;

interface Palette {
  bg: string;
  card: string;
  cardBorder: string;
  termsBg: string;
  accent: string;
  accentLight: string;
  totalBg: string;
  totalBorder: string;
  totalLabel: string;
  heading: string;
  body: string;
  muted: string;
  topbar: string;
}

const PALETTES: Record<ProposalTemplate, Palette> = {
  DARK_LUXE: {
    bg: '#0d0703',
    card: '#1a0d08',
    cardBorder: '#3a2a1a',
    termsBg: '#241708',
    accent: '#d4a843',
    accentLight: '#ecc96a',
    totalBg: '#5c1712',
    totalBorder: '#c0392b',
    totalLabel: '#d4a843',
    heading: '#ffffff',
    body: '#ddd5c8',
    muted: '#9e8e80',
    topbar: '#d4a843',
  },
  BRIGHT_MODERN: {
    bg: '#ffffff',
    card: '#f6f6fb',
    cardBorder: '#e6e5f2',
    termsBg: '#f1effd',
    accent: '#5b4fe0',
    accentLight: '#4638c9',
    totalBg: '#5b4fe0',
    totalBorder: '#4638c9',
    totalLabel: '#e3e0fc',
    heading: '#141127',
    body: '#4a4762',
    muted: '#8b8aa3',
    topbar: '#5b4fe0',
  },
};

// ponytail: pdfkit's standard fonts (Helvetica) only cover WinAnsi, which has no ₹ glyph —
// embedding a Unicode font just for the rupee sign isn't worth it yet, so the PDF spells it out.
function money(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

// proposalNumber is server-generated (WP-{year}-{seq}), never user input, but the
// header value is still built from it — strip CR/LF/quotes/backslash defensively
// so a future format change can't turn into header injection.
export function proposalPdfContentDisposition(proposalNumber: string): string {
  const safeName = proposalNumber.replace(/[\r\n"\\]/g, '_');
  return `attachment; filename="${safeName}.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}.pdf`;
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

function fillPageBackground(doc: PDFKit.PDFDocument, palette: Palette): void {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(palette.bg);
  doc.fillColor(palette.body).font('Helvetica');
  doc.x = PAGE_MARGIN;
  doc.y = PAGE_MARGIN;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - PAGE_MARGIN) {
    doc.addPage();
  }
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
  template: ProposalTemplate;
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
  const palette = PALETTES[proposal.template] ?? PALETTES.DARK_LUXE;
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('pageAdded', () => fillPageBackground(doc, palette));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  fillPageBackground(doc, palette);

  renderHeader(doc, palette, proposal, business);
  renderCustomer(doc, palette, proposal);
  renderWedding(doc, palette, proposal);
  renderLineItems(
    doc,
    palette,
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
    palette,
    'Services',
    includedItems.map((i) => ({
      name: i.quantity > 1 ? `${i.serviceName} x ${i.quantity}` : i.serviceName,
      description: i.description,
      amount: i.total,
    })),
  );
  renderLineItems(
    doc,
    palette,
    'Optional Services (not included in total)',
    optionalItems.map((i) => ({
      name: i.quantity > 1 ? `${i.serviceName} x ${i.quantity}` : i.serviceName,
      description: i.description,
      amount: i.total,
    })),
  );
  renderPricing(doc, palette, proposal);
  renderTerms(doc, palette, business);
  renderFooter(doc, palette, business);

  doc.end();
  return done;
}

function sectionHeading(doc: PDFKit.PDFDocument, palette: Palette, title: string): void {
  ensureSpace(doc, 40);
  doc.y += 10;
  const label = title.toUpperCase();
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(palette.accent);
  doc.text(label, PAGE_MARGIN, y, { lineBreak: false });
  const textWidth = doc.widthOfString(label);
  doc
    .moveTo(PAGE_MARGIN + textWidth + 10, y + 4)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, y + 4)
    .strokeColor(palette.cardBorder)
    .lineWidth(0.75)
    .stroke();
  doc.x = PAGE_MARGIN;
  doc.y = y + 16;
  doc.fillColor(palette.body).font('Helvetica');
}

function renderHeader(
  doc: PDFKit.PDFDocument,
  palette: Palette,
  proposal: PdfProposal,
  business: PdfBusiness,
): void {
  doc.rect(0, 0, doc.page.width, 4).fill(palette.topbar);
  doc.fillColor(palette.body);

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

  doc.fontSize(19).font('Times-Bold').fillColor(palette.accentLight).text(business.name, textX, startY, { width: 280 });
  doc.fontSize(9.5).font('Helvetica').fillColor(palette.muted);
  const contact = [business.phone, business.email, business.website, business.address]
    .filter(Boolean)
    .join('  ·  ');
  if (contact) doc.text(contact, textX, doc.y, { width: 280 });

  doc
    .fontSize(13)
    .font('Times-Bold')
    .fillColor(palette.accentLight)
    .text(proposal.proposalNumber, AMOUNT_X - 100, startY, { width: 235, align: 'right' });
  doc
    .fontSize(9.5)
    .font('Helvetica')
    .fillColor(palette.muted)
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

  doc.x = PAGE_MARGIN;
  doc.y = Math.max(doc.y, startY + 60);
  doc.moveDown(0.6);
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
    .strokeColor(palette.cardBorder)
    .stroke();
  doc.fillColor(palette.body);
}

function renderCustomer(doc: PDFKit.PDFDocument, palette: Palette, proposal: PdfProposal): void {
  sectionHeading(doc, palette, 'Customer');
  doc.fontSize(11).fillColor(palette.heading).text(proposal.customer.name, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc
    .fontSize(10)
    .fillColor(palette.muted)
    .text(proposal.customer.phone, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  if (proposal.customer.email) {
    doc.text(proposal.customer.email, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  }
  doc.fillColor(palette.body);
}

function renderWedding(doc: PDFKit.PDFDocument, palette: Palette, proposal: PdfProposal): void {
  sectionHeading(doc, palette, 'Wedding Details');
  doc
    .fontSize(11)
    .fillColor(palette.heading)
    .text(`${formatDate(proposal.weddingDate)} — ${proposal.weddingLocation}`, PAGE_MARGIN, doc.y, {
      width: CONTENT_WIDTH,
    });
  if (proposal.numberOfDays != null) {
    doc
      .fontSize(10)
      .fillColor(palette.muted)
      .text(
        `${proposal.numberOfDays} day${proposal.numberOfDays === 1 ? '' : 's'}`,
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH },
      );
  }
  doc.fillColor(palette.body);
}

function renderLineItems(
  doc: PDFKit.PDFDocument,
  palette: Palette,
  title: string,
  items: { name: string; description: string | null; amount: number }[],
): void {
  if (!items.length) return;
  sectionHeading(doc, palette, title);
  const innerWidth = CONTENT_WIDTH - CARD_PAD * 2;
  for (const item of items) {
    doc.font('Helvetica-Bold').fontSize(11);
    const nameH = doc.heightOfString(item.name, { width: innerWidth });
    let descH = 0;
    if (item.description) {
      doc.font('Helvetica').fontSize(9.5);
      descH = doc.heightOfString(item.description, { width: innerWidth });
    }
    const cardHeight = CARD_PAD * 2 + nameH + (descH ? descH + 4 : 0);
    ensureSpace(doc, cardHeight + 10);

    const cardY = doc.y;
    doc
      .roundedRect(PAGE_MARGIN, cardY, CONTENT_WIDTH, cardHeight, 8)
      .fillAndStroke(palette.card, palette.cardBorder);

    doc
      .fillColor(palette.heading)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(item.name, PAGE_MARGIN + CARD_PAD, cardY + CARD_PAD, { width: innerWidth - 110 });
    if (item.description) {
      doc
        .fillColor(palette.muted)
        .font('Helvetica')
        .fontSize(9.5)
        .text(item.description, PAGE_MARGIN + CARD_PAD, cardY + CARD_PAD + nameH + 4, {
          width: innerWidth - 110,
        });
    }
    doc
      .fillColor(palette.accentLight)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(money(item.amount), AMOUNT_X, cardY + CARD_PAD, {
        width: AMOUNT_WIDTH - CARD_PAD,
        align: 'right',
        lineBreak: false,
      });

    doc.x = PAGE_MARGIN;
    doc.y = cardY + cardHeight + 7;
    doc.fillColor(palette.body);
  }
}

function renderPricing(doc: PDFKit.PDFDocument, palette: Palette, proposal: PdfProposal): void {
  sectionHeading(doc, palette, 'Pricing Summary');
  const taxableAmount = proposal.subtotal - proposal.discountAmount;

  const row = (label: string, amount: string) => {
    const startY = doc.y;
    doc.fontSize(10.5).font('Helvetica').fillColor(palette.muted);
    doc.text(amount, AMOUNT_X, startY, { width: AMOUNT_WIDTH, align: 'right', lineBreak: false });
    doc.y = startY;
    doc.fillColor(palette.body).text(label, PAGE_MARGIN, startY, { width: NAME_WIDTH });
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

  doc.y += 10;
  ensureSpace(doc, 60);
  const boxY = doc.y;
  const boxHeight = 52;
  doc
    .roundedRect(PAGE_MARGIN, boxY, CONTENT_WIDTH, boxHeight, 10)
    .fillAndStroke(palette.totalBg, palette.totalBorder);
  doc
    .fillColor(palette.totalLabel)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('FINAL TOTAL', PAGE_MARGIN + CARD_PAD, boxY + 14, { width: 200 });
  doc
    .fillColor('#ffffff')
    .font('Times-Bold')
    .fontSize(22)
    .text(money(proposal.total), AMOUNT_X - 60, boxY + 12, {
      width: AMOUNT_WIDTH + 60,
      align: 'right',
      lineBreak: false,
    });

  doc.x = PAGE_MARGIN;
  doc.y = boxY + boxHeight + 10;
  doc.fillColor(palette.body);
}

function renderTerms(doc: PDFKit.PDFDocument, palette: Palette, business: PdfBusiness): void {
  if (!business.defaultTerms) return;
  sectionHeading(doc, palette, 'Terms & Conditions');
  const innerWidth = CONTENT_WIDTH - CARD_PAD * 2;
  doc.font('Helvetica').fontSize(9.5);
  const textH = doc.heightOfString(business.defaultTerms, { width: innerWidth });
  const boxHeight = CARD_PAD * 2 + textH;
  ensureSpace(doc, boxHeight + 10);
  const boxY = doc.y;
  doc
    .roundedRect(PAGE_MARGIN, boxY, CONTENT_WIDTH, boxHeight, 8)
    .fillAndStroke(palette.termsBg, palette.cardBorder);
  doc
    .fillColor(palette.muted)
    .text(business.defaultTerms, PAGE_MARGIN + CARD_PAD, boxY + CARD_PAD, { width: innerWidth });
  doc.x = PAGE_MARGIN;
  doc.y = boxY + boxHeight + 10;
  doc.fillColor(palette.body);
}

function renderFooter(doc: PDFKit.PDFDocument, palette: Palette, business: PdfBusiness): void {
  ensureSpace(doc, 40);
  doc.y += 10;
  doc
    .fontSize(8.5)
    .fillColor(palette.muted)
    .text(`Generated by ${business.name} on ${formatDate(new Date())}`, PAGE_MARGIN, doc.y, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
}

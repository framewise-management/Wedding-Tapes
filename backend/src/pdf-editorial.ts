import PDFDocument from 'pdfkit';
import {
  addDays,
  formatDate,
  groupByEvent,
  money,
  termsText,
  type PdfBusiness,
  type PdfProposal,
} from './pdf-shared';

const PAGE_MARGIN = 60;
const CONTENT_WIDTH = 475;
const COL_SERVICE = 145;
const COL_DETAILS = 250;
const COL_PRICE = 80;
const ROW_GAP = 13;

const INK = '#1f1a17';
const BODY = '#2b2622';
const MUTED = '#6b6259';
const SOFT = '#a08b74';
const RULE = '#e4d9c4';
const RULE_SOFT = '#eee3d3';
const GOLD = '#c9a86a';
const PAPER = '#fffdf9';

// The reference proposal's own split: a booking token, the bulk before the
// event, the remainder on delivery. Both ends round to the rupee and the middle
// absorbs the difference, so the three stages always re-sum to the total.
const DEPOSIT_RATE = 0.1;
const FINAL_RATE = 0.1;
const SELECTION_DUE_DAYS = 14;
const DELIVERY_WINDOW = '15–25 days from selection';

const X_SERVICE = PAGE_MARGIN;
const X_DETAILS = PAGE_MARGIN + COL_SERVICE;
const X_PRICE = PAGE_MARGIN + COL_SERVICE + COL_DETAILS;

function tracked(doc: PDFKit.PDFDocument, text: string, x: number, y: number, options = {}) {
  doc.text(text.toUpperCase(), x, y, { characterSpacing: 1.2, ...options });
}

function rule(doc: PDFKit.PDFDocument, y: number, color = RULE_SOFT, x = PAGE_MARGIN, width = CONTENT_WIDTH) {
  doc.rect(x, y, width, 0.8).fill(color);
}

/** A drawn diamond, since Helvetica has no ✦ glyph and embedding a font for one mark isn't worth it. */
function ornament(doc: PDFKit.PDFDocument, y: number) {
  const cx = doc.page.width / 2;
  const r = 4;
  doc
    .moveTo(cx, y - r)
    .lineTo(cx + r, y)
    .lineTo(cx, y + r)
    .lineTo(cx - r, y)
    .fill(GOLD);
}

function startPage(doc: PDFKit.PDFDocument, business: PdfBusiness, title: string, first: boolean) {
  if (!first) doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PAPER);

  const y = PAGE_MARGIN;
  doc.font('Helvetica').fontSize(12).fillColor(INK).text(business.name, PAGE_MARGIN, y, {
    width: CONTENT_WIDTH / 2,
    lineBreak: false,
  });
  doc.font('Helvetica').fontSize(10).fillColor(SOFT);
  tracked(doc, title, PAGE_MARGIN + CONTENT_WIDTH / 2, y + 2, {
    width: CONTENT_WIDTH / 2,
    align: 'right',
    lineBreak: false,
  });
  rule(doc, y + 24, RULE);
  doc.x = PAGE_MARGIN;
  doc.y = y + 48;
  doc.fillColor(BODY).font('Helvetica');
}

function sectionLabel(doc: PDFKit.PDFDocument, label: string) {
  doc.font('Helvetica').fontSize(9).fillColor(SOFT);
  tracked(doc, label, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.x = PAGE_MARGIN;
  doc.y += 8;
  doc.fillColor(BODY);
}

/** One table row: three columns, hairline underneath. Returns nothing; advances doc.y. */
function tableRow(
  doc: PDFKit.PDFDocument,
  cells: { left: string; middle: string; right: string },
  opts: { bold?: boolean; size?: number; color?: string; ruleColor?: string | null } = {},
) {
  const size = opts.size ?? 10.5;
  const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
  const top = doc.y;

  doc.font(font).fontSize(size).fillColor(opts.color ?? BODY);
  const leftH = doc.heightOfString(cells.left, { width: COL_SERVICE - 10 });
  doc.font('Helvetica').fontSize(size - 0.5).fillColor(MUTED);
  const midH = cells.middle ? doc.heightOfString(cells.middle, { width: COL_DETAILS - 10 }) : 0;
  const height = Math.max(leftH, midH, size + 2);

  doc.font(font).fontSize(size).fillColor(opts.color ?? BODY);
  doc.text(cells.left, X_SERVICE, top, { width: COL_SERVICE - 10 });
  if (cells.middle) {
    doc.font('Helvetica').fontSize(size - 0.5).fillColor(opts.bold ? (opts.color ?? BODY) : MUTED);
    doc.text(cells.middle, X_DETAILS, top, { width: COL_DETAILS - 10 });
  }
  doc.font(font).fontSize(size).fillColor(opts.color ?? BODY);
  doc.text(cells.right, X_PRICE, top, { width: COL_PRICE, align: 'right', lineBreak: false });

  doc.x = PAGE_MARGIN;
  doc.y = top + height + ROW_GAP / 2;
  if (opts.ruleColor !== null) {
    rule(doc, doc.y, opts.ruleColor ?? RULE_SOFT);
  }
  doc.y += ROW_GAP / 2;
}

function tableHead(doc: PDFKit.PDFDocument, left: string, middle: string, right: string) {
  const top = doc.y;
  doc.font('Helvetica').fontSize(8.5).fillColor(SOFT);
  tracked(doc, left, X_SERVICE, top, { width: COL_SERVICE - 10, lineBreak: false });
  tracked(doc, middle, X_DETAILS, top, { width: COL_DETAILS - 10, lineBreak: false });
  tracked(doc, right, X_PRICE, top, { width: COL_PRICE, align: 'right', lineBreak: false });
  doc.x = PAGE_MARGIN;
  doc.y = top + 14;
  rule(doc, doc.y, RULE);
  doc.y += ROW_GAP;
  doc.fillColor(BODY);
}

function groupRow(doc: PDFKit.PDFDocument, label: string) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GOLD);
  tracked(doc, label, X_SERVICE, doc.y, { width: CONTENT_WIDTH });
  doc.x = PAGE_MARGIN;
  doc.y += 12;
  doc.fillColor(BODY);
}

function renderServicesPage(doc: PDFKit.PDFDocument, proposal: PdfProposal, business: PdfBusiness) {
  startPage(doc, business, 'Services & Investment', true);

  sectionLabel(doc, 'Prepared for');
  doc.font('Helvetica').fontSize(24).fillColor(INK).text(proposal.customer.name, PAGE_MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.y += 10;

  // Meta line: the event schedule collapses to a single date when there is one.
  const eventLabel =
    proposal.events.length > 1
      ? `${formatDate(proposal.weddingDate)} – ${formatDate(proposal.weddingEndDate ?? proposal.weddingDate)}`
      : formatDate(proposal.events[0]?.date ?? proposal.weddingDate);
  const meta = [
    ['Event date', eventLabel],
    ['Generated', formatDate(proposal.createdAt)],
    proposal.validUntil ? ['Valid until', formatDate(proposal.validUntil)] : null,
  ].filter(Boolean) as [string, string][];

  doc.fontSize(9.5);
  let metaX = PAGE_MARGIN;
  const metaY = doc.y;
  for (const [label, value] of meta) {
    doc.font('Helvetica').fillColor(SOFT).text(label, metaX, metaY, { lineBreak: false });
    const labelWidth = doc.widthOfString(label) + 5;
    doc.font('Helvetica').fillColor(BODY).text(value, metaX + labelWidth, metaY, { lineBreak: false });
    metaX += labelWidth + doc.widthOfString(value) + 18;
  }
  doc.x = PAGE_MARGIN;
  doc.y = metaY + 30;

  if (proposal.events.length > 1) {
    sectionLabel(doc, 'Schedule');
    for (const event of proposal.events) {
      tableRow(
        doc,
        { left: event.name, middle: event.location ?? proposal.weddingLocation, right: formatDate(event.date) },
        { size: 10 },
      );
    }
    doc.y += 14;
  }

  const included = [
    ...groupByEvent(proposal, proposal.packages).map((p) => ({
      name: p.quantity > 1 ? `${p.packageName} x ${p.quantity}` : p.packageName,
      detail: p.packageDescription ?? '',
      amount: p.total,
      group: p.group,
    })),
    ...groupByEvent(
      proposal,
      proposal.items.filter((i) => !i.isOptional),
    ).map((i) => ({
      name: i.quantity > 1 ? `${i.serviceName} x ${i.quantity}` : i.serviceName,
      detail: i.description ?? '',
      amount: i.total,
      group: i.group,
    })),
  ];

  tableHead(doc, 'Service', 'Details', 'Price');
  const showGroups = included.some((line) => line.group);
  let currentGroup: string | null = null;
  for (const line of included) {
    const group = line.group ?? 'All events';
    if (showGroups && group !== currentGroup) {
      groupRow(doc, group);
      currentGroup = group;
    }
    tableRow(doc, { left: line.name, middle: line.detail, right: money(line.amount) });
  }

  if (proposal.discountAmount > 0) {
    const label =
      proposal.discountType === 'PERCENTAGE' ? `Discount (${proposal.discountValue}%)` : 'Discount';
    tableRow(doc, { left: label, middle: '', right: `- ${money(proposal.discountAmount)}` }, { color: MUTED });
  }
  if (proposal.taxAmount > 0) {
    tableRow(
      doc,
      { left: `Tax (${proposal.taxRate}%)`, middle: '', right: `+ ${money(proposal.taxAmount)}` },
      { color: MUTED },
    );
  }

  doc.y += 4;
  tableRow(
    doc,
    { left: 'Total', middle: '', right: money(proposal.total) },
    { bold: true, size: 13, color: INK, ruleColor: null },
  );

  const optional = proposal.items.filter((i) => i.isOptional);
  if (optional.length) {
    doc.y += 18;
    sectionLabel(doc, 'Optional — not included in the total');
    for (const item of groupByEvent(proposal, optional)) {
      tableRow(doc, {
        left: item.quantity > 1 ? `${item.serviceName} x ${item.quantity}` : item.serviceName,
        middle: item.description ?? '',
        right: money(item.total),
      });
    }
  }
}

function renderPaymentPage(doc: PDFKit.PDFDocument, proposal: PdfProposal, business: PdfBusiness) {
  startPage(doc, business, 'Payment Plan', false);

  const deposit = Math.round(proposal.total * DEPOSIT_RATE);
  const final = Math.round(proposal.total * FINAL_RATE);
  const balance = proposal.total - deposit - final;
  const pct = (amount: number) =>
    proposal.total ? `${Math.round((amount / proposal.total) * 100)}%` : '0%';

  tableHead(doc, 'Stage', 'When', 'Amount');
  const stages: [string, string, number][] = [
    ['Booking token', 'On confirmation', deposit],
    ['Balance before event', 'Before the event day', balance],
    ['Final payment', 'At time of deliverables', final],
  ];
  for (const [stage, when, amount] of stages) {
    tableRow(doc, { left: stage, middle: `${when}  ·  ${pct(amount)}`, right: money(amount) });
  }
  doc.y += 4;
  tableRow(
    doc,
    { left: 'Total', middle: '100%', right: money(proposal.total) },
    { bold: true, size: 13, color: INK, ruleColor: null },
  );

  doc.y += 30;
  sectionLabel(doc, 'Terms');
  const terms =
    termsText(business) ??
    `The payment plan above is non-negotiable to hold the event date. The booking token confirms exclusivity for ${formatDate(
      proposal.weddingDate,
    )} and is credited toward the total investment. Album prices are tentative and subject to change based on the quality of album chosen.`;
  doc.font('Helvetica').fontSize(10.5).fillColor(BODY).text(terms, PAGE_MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 4,
  });
}

function renderDeliverablesPage(
  doc: PDFKit.PDFDocument,
  proposal: PdfProposal,
  business: PdfBusiness,
) {
  startPage(doc, business, 'Deliverables & Timelines', false);

  sectionLabel(doc, 'Deliverables');
  // The same service booked on three ceremonies is one deliverable, not three,
  // so lines collapse by name and carry the ceremonies they cover instead.
  const eventNames = new Map(proposal.events.map((e) => [e.id, e.name]));
  const deliverables = new Map<string, { name: string; detail: string | null; events: string[] }>();
  const addDeliverable = (name: string, detail: string | null, eventId: string | null) => {
    const entry = deliverables.get(name) ?? { name, detail, events: [] };
    const eventName = eventId ? eventNames.get(eventId) : null;
    if (eventName && !entry.events.includes(eventName)) entry.events.push(eventName);
    deliverables.set(name, entry);
  };
  for (const p of proposal.packages) {
    addDeliverable(p.packageName, p.packageDescription, p.proposalEventId);
  }
  for (const i of proposal.items.filter((item) => !item.isOptional)) {
    addDeliverable(i.serviceName, i.description, i.proposalEventId);
  }

  for (const line of deliverables.values()) {
    const parts = [line.name];
    if (line.detail) parts.push(line.detail);
    if (line.events.length) parts.push(line.events.join(', '));
    doc.font('Helvetica').fontSize(10.5).fillColor(BODY);
    doc.text(parts.join(' — '), PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 });
    doc.y += 6;
  }

  doc.y += 24;
  sectionLabel(doc, 'Timelines');
  const selectionDue = addDays(proposal.weddingEndDate ?? proposal.weddingDate, SELECTION_DUE_DAYS);
  tableHead(doc, 'Milestone', 'When', '');
  const milestones: [string, string][] = [
    ['Photo & song selection due', formatDate(selectionDue)],
    ['Video editing', DELIVERY_WINDOW],
    ['Album delivery', DELIVERY_WINDOW],
  ];
  for (const [name, when] of milestones) {
    tableRow(doc, { left: name, middle: when, right: '' }, { size: 10 });
  }

  const contact = [business.phone, business.email].filter(Boolean).join('  ·  ');
  if (contact) {
    doc.font('Helvetica').fontSize(9.5).fillColor(SOFT);
    doc.text(contact, PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 12, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  }
}

export async function generateEditorialPdf(
  proposal: PdfProposal,
  business: PdfBusiness,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.addPage();
  renderServicesPage(doc, proposal, business);
  ornament(doc, doc.page.height - PAGE_MARGIN - 30);
  renderPaymentPage(doc, proposal, business);
  ornament(doc, doc.page.height - PAGE_MARGIN - 30);
  renderDeliverablesPage(doc, proposal, business);
  ornament(doc, doc.page.height - PAGE_MARGIN - 44);

  doc.end();
  return done;
}

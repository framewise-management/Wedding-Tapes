import type { DiscountType, ProposalTemplate } from './db/schema';

export interface PdfBusiness {
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  defaultTerms: string | null;
  terms?: { title: string; body: string }[];
}

// Clause library wins; defaultTerms is the pre-library fallback.
export function termsText(business: PdfBusiness): string | null {
  if (business.terms?.length) {
    return business.terms.map((t) => `${t.title}\n${t.body}`).join('\n\n');
  }
  return business.defaultTerms;
}

export interface PdfProposal {
  proposalNumber: string;
  createdAt: string | Date;
  validUntil: string | null;
  weddingDate: string;
  weddingEndDate: string | null;
  weddingLocation: string;
  numberOfDays: number | null;
  events: { id: string; name: string; date: string; location: string | null }[];
  template: ProposalTemplate;
  subtotal: number;
  discountAmount: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  taxRate: number;
  taxAmount: number;
  total: number;
  customer: { name: string; phone: string; email: string | null };
  packages: {
    packageName: string;
    packageDescription: string | null;
    quantity: number;
    total: number;
    proposalEventId: string | null;
  }[];
  items: {
    serviceName: string;
    description: string | null;
    quantity: number;
    total: number;
    isOptional: boolean;
    proposalEventId: string | null;
  }[];
}

// ponytail: pdfkit's standard fonts (Helvetica) only cover WinAnsi, which has no ₹ glyph —
// embedding a Unicode font just for the rupee sign isn't worth it yet, so the PDF spells it out.
export function money(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN')}`;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function addDays(value: string, days: number): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Orders lines by their ceremony (schedule order, unassigned last) and labels
 * each with the group heading it belongs under. `group: null` on every line --
 * a proposal with no event assignments -- renders exactly as it did before.
 */
export function groupByEvent<T extends { proposalEventId: string | null }>(
  proposal: PdfProposal,
  items: T[],
): (T & { group: string | null })[] {
  const order = new Map(proposal.events.map((e, i) => [e.id, i]));
  const labels = new Map(proposal.events.map((e) => [e.id, `${e.name} · ${shortDate(e.date)}`]));
  return items
    .map((item) => ({
      item,
      group: (item.proposalEventId && labels.get(item.proposalEventId)) || null,
      rank: item.proposalEventId
        ? order.get(item.proposalEventId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item, group }) => ({ ...item, group }));
}

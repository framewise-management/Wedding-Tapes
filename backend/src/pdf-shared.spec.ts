import { describe, expect, it } from 'vitest';
import { filterProposalToEvent, type PdfProposal } from './pdf-shared';

const proposal: PdfProposal = {
  proposalNumber: 'WP-2026-0001',
  createdAt: '2026-01-01',
  validUntil: null,
  weddingDate: '2026-12-01',
  weddingEndDate: '2026-12-03',
  weddingLocation: 'Goa',
  numberOfDays: 3,
  events: [
    { id: 'e1', name: 'Haldi', date: '2026-12-01', location: null },
    { id: 'e2', name: 'Wedding', date: '2026-12-03', location: null },
  ],
  template: 'DARK_LUXE',
  subtotal: 1000,
  discountAmount: 100,
  discountType: 'FIXED',
  discountValue: 100,
  taxRate: 18,
  taxAmount: 162,
  total: 1062,
  customer: { name: 'A', phone: '1', email: null },
  packages: [
    { packageName: 'Gold', packageDescription: null, quantity: 2, unitPrice: 300, total: 600, proposalEventId: 'e1' },
    { packageName: 'Silver', packageDescription: null, quantity: 1, unitPrice: 200, total: 200, proposalEventId: 'e2' },
  ],
  items: [
    { serviceName: 'Drone', description: null, quantity: 1, unitPrice: 150, total: 150, isOptional: false, proposalEventId: 'e1' },
    { serviceName: 'Album', description: null, quantity: 1, unitPrice: 50, total: 50, isOptional: true, proposalEventId: 'e1' },
    { serviceName: 'Reel', description: null, quantity: 1, unitPrice: 50, total: 50, isOptional: false, proposalEventId: 'e2' },
  ],
};

describe('filterProposalToEvent', () => {
  it('keeps only the event, its lines, and a discount-free total without optional items', () => {
    const scoped = filterProposalToEvent(proposal, 'e1')!;

    expect(scoped.events.map((e) => e.id)).toEqual(['e1']);
    expect(scoped.packages.map((p) => p.packageName)).toEqual(['Gold']);
    expect(scoped.items.map((i) => i.serviceName)).toEqual(['Drone', 'Album']);
    expect(scoped.subtotal).toBe(750);
    expect(scoped.total).toBe(750);
    expect(scoped.discountAmount).toBe(0);
    expect(scoped.discountType).toBeNull();
    expect(scoped.taxAmount).toBe(0);
  });

  it('returns undefined for an event not on the proposal', () => {
    expect(filterProposalToEvent(proposal, 'nope')).toBeUndefined();
  });
});

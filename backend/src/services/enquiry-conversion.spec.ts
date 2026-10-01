import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = { selectRows: [] as unknown[], updateRows: [] as unknown[][] };
  const chain = (rows: () => unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'set', 'returning', 'values', 'orderBy', 'limit']) {
      c[m] = vi.fn(() => c);
    }
    c.then = (resolve: (v: unknown) => void) => resolve(rows());
    return c;
  };
  const db = {
    select: vi.fn(() => chain(() => state.selectRows)),
    update: vi.fn(() => chain(() => state.updateRows.shift() ?? [])),
  };
  return { state, db, createCustomer: vi.fn(), removeCustomer: vi.fn(), createProposal: vi.fn() };
});

vi.mock('../db/client', () => ({ db: mocks.db }));
vi.mock('./customers', () => ({
  customerService: { create: mocks.createCustomer, remove: mocks.removeCustomer },
}));
vi.mock('./proposals', () => ({ proposalService: { create: mocks.createProposal } }));

import { BadRequestError, ConflictError } from '../lib/http-error';
import { enquiryService } from './enquiries';

const enquiry = {
  id: 'e1',
  businessId: 'b1',
  clientName: 'Priya',
  phone: '999',
  email: null,
  eventDate: '2027-02-08',
  location: 'Goa',
  eventDuration: 3,
  services: ['s1', 's2'],
  source: 'Meta Ad',
  budget: '1L',
  message: 'Hello',
  status: 'CONTACTED',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.selectRows = [enquiry];
  mocks.state.updateRows = [[{ ...enquiry, status: 'CONVERTED' }]];
  mocks.createCustomer.mockResolvedValue({ id: 'c1' });
  mocks.createProposal.mockResolvedValue({ id: 'p1' });
  mocks.removeCustomer.mockResolvedValue(undefined);
});

describe('convertEnquiryToProposal', () => {
  it('rejects an enquiry that lacks required fields without writing anything', async () => {
    mocks.state.selectRows = [{ ...enquiry, phone: null, services: [] }];

    await expect(enquiryService.convertToProposal('b1', 'e1')).rejects.toThrow(/phone, at least one service/);
    await expect(enquiryService.convertToProposal('b1', 'e1')).rejects.toBeInstanceOf(BadRequestError);
    expect(mocks.db.update).not.toHaveBeenCalled();
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it('refuses a second conversion', async () => {
    mocks.state.updateRows = [[]];

    await expect(enquiryService.convertToProposal('b1', 'e1')).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it('creates the customer and a draft with one item per service', async () => {
    const proposal = await enquiryService.convertToProposal('b1', 'e1');

    expect(proposal).toEqual({ id: 'p1' });
    expect(mocks.createCustomer).toHaveBeenCalledWith('b1', { name: 'Priya', phone: '999', email: undefined });
    expect(mocks.createProposal).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({
        customerId: 'c1',
        weddingDate: '2027-02-08',
        weddingLocation: 'Goa',
        numberOfDays: 3,
        items: [
          { serviceId: 's1', quantity: 1, isOptional: false },
          { serviceId: 's2', quantity: 1, isOptional: false },
        ],
      }),
    );
  });

  it('removes the customer and restores the status when the proposal cannot be created', async () => {
    mocks.createProposal.mockRejectedValue(new BadRequestError('Drone has no price set'));
    mocks.state.updateRows = [[{ ...enquiry, status: 'CONVERTED' }], [enquiry]];

    await expect(enquiryService.convertToProposal('b1', 'e1')).rejects.toThrow('Drone has no price set');

    expect(mocks.removeCustomer).toHaveBeenCalledWith('b1', 'c1');
    expect(mocks.db.update).toHaveBeenCalledTimes(2);
  });
});

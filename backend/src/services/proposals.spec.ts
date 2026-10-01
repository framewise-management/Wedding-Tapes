import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.where = vi.fn(() => c);
    c.values = vi.fn(() => c);
    c.set = vi.fn(() => c);
    c.then = (resolve: (v: unknown) => void) => resolve(undefined);
    return c;
  };
  const writer = () => ({ update: vi.fn(chain), delete: vi.fn(chain), insert: vi.fn(chain) });
  const tx = writer();
  const db = {
    ...writer(),
    query: { proposals: { findFirst: vi.fn() } },
    transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { db, tx, findOneService: vi.fn() };
});

vi.mock('../db/client', () => ({ db: mocks.db }));
vi.mock('./catalog-services', () => ({ findOneService: mocks.findOneService }));
vi.mock('./calendar-sync', () => ({ syncProposalToCalendars: vi.fn(), removeProposalFromCalendars: vi.fn() }));
vi.mock('../lib/discord', () => ({ notifyDiscord: vi.fn() }));

import { NotFoundError } from '../lib/http-error';
import { updateProposal } from './proposals';

const draft = {
  id: 'p1',
  businessId: 'b1',
  status: 'DRAFT',
  discountType: null,
  discountValue: null,
  taxRate: 0,
  events: [],
  packages: [],
  items: [{ serviceId: 's-old', total: 100, isOptional: false }],
};

const service = { id: 's-new', name: 'Drone', description: null, active: true, flatPrice: 500 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.query.proposals.findFirst.mockResolvedValue(draft);
});

describe('updateProposal', () => {
  it('writes nothing when a replacement item fails validation', async () => {
    mocks.findOneService.mockRejectedValue(new NotFoundError('Service not found'));

    await expect(
      updateProposal('b1', 'p1', { items: [{ serviceId: 's-new', quantity: 1, isOptional: false }] }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(mocks.db.delete).not.toHaveBeenCalled();
    expect(mocks.db.update).not.toHaveBeenCalled();
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.tx.delete).not.toHaveBeenCalled();
  });

  it('performs every write inside one transaction', async () => {
    mocks.findOneService.mockResolvedValue(service);

    await updateProposal('b1', 'p1', {
      items: [{ serviceId: 's-new', quantity: 2, isOptional: false }],
    });

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.delete).toHaveBeenCalled();
    expect(mocks.tx.insert).toHaveBeenCalled();
    expect(mocks.tx.update).toHaveBeenCalled();
    expect(mocks.db.delete).not.toHaveBeenCalled();
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.db.update).not.toHaveBeenCalled();
  });
});

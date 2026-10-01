import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'where', 'set', 'returning', 'values', 'orderBy', 'limit']) {
      c[m] = vi.fn(() => c);
    }
    c.then = (resolve: (v: unknown) => void) => resolve([]);
    return c;
  };
  return { db: { select: vi.fn(chain), update: vi.fn(chain), delete: vi.fn(chain), insert: vi.fn(chain) } };
});

vi.mock('../db/client', () => ({ db: mocks.db }));

import { NotFoundError } from '../lib/http-error';
import { enquiryService } from './enquiries';

describe('enquiries service', () => {
  it('findOneEnquiry throws NotFoundError when the enquiry is not in the business', async () => {
    await expect(enquiryService.findOne('b1', 'e1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updateEnquiry throws NotFoundError when no row matched', async () => {
    await expect(enquiryService.update('b1', 'e1', { status: 'CONTACTED' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deleteEnquiry throws NotFoundError when no row matched', async () => {
    await expect(enquiryService.remove('b1', 'e1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

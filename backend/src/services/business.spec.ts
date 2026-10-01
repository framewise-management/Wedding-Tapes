import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findAllTerms: vi.fn() }));

import { NotFoundError } from '../lib/http-error';
import { BusinessService } from './business';

const businessService = new BusinessService(
  { query: { businesses: { findFirst: mocks.findFirst } } } as never,
  { findAll: mocks.findAllTerms } as never,
);

const row = {
  id: 'b1',
  name: 'Tapes',
  appleId: 'me@icloud.com',
  applePasswordEnc: 'enc-secret',
  appleCalendarUrl: 'https://caldav/x',
  calendarToken: 'tok',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findFirst.mockResolvedValue(row);
  mocks.findAllTerms.mockResolvedValue([{ id: 't1' }]);
});

describe('businessService.get', () => {
  it('never exposes the encrypted Apple password or calendar token', async () => {
    const result = await businessService.get('b1');

    expect(result).not.toHaveProperty('applePasswordEnc');
    expect(result).not.toHaveProperty('calendarToken');
    expect(JSON.stringify(result)).not.toContain('enc-secret');
    expect(JSON.stringify(result)).not.toContain('tok"');
  });

  it('reports connection state and attaches active terms', async () => {
    const result = await businessService.get('b1');

    expect(result.appleConnected).toBe(true);
    expect(result.appleCredentialSaved).toBe(true);
    expect(result.terms).toEqual([{ id: 't1' }]);
    expect(mocks.findAllTerms).toHaveBeenCalledWith('b1', true);
  });

  it('throws NotFound for an unknown business', async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    await expect(businessService.get('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

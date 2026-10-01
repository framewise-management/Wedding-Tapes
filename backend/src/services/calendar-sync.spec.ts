import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findBusinessRow: vi.fn(),
  syncGoogle: vi.fn(),
  syncApple: vi.fn(),
  removeGoogle: vi.fn(),
  removeApple: vi.fn(),
}));

vi.mock('../db/client', () => ({ db: { query: { proposals: { findFirst: mocks.findFirst } } } }));
vi.mock('./business', () => ({ findBusinessRow: mocks.findBusinessRow }));
vi.mock('./google-calendar', () => ({
  syncProposalToGoogle: mocks.syncGoogle,
  removeGoogleEvent: mocks.removeGoogle,
}));
vi.mock('./apple-calendar', () => ({
  syncProposalToApple: mocks.syncApple,
  removeAppleEvent: mocks.removeApple,
}));

import { removeProposalFromCalendars, syncProposalToCalendars } from './calendar-sync';

const proposal = { id: 'p1', businessId: 'b1', status: 'SENT', googleEventId: 'g1' };
const business = { id: 'b1', googleCalendarId: 'cal' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.findFirst.mockResolvedValue(proposal);
  mocks.findBusinessRow.mockResolvedValue(business);
  for (const m of [mocks.syncGoogle, mocks.syncApple, mocks.removeGoogle, mocks.removeApple]) {
    m.mockResolvedValue(undefined);
  }
});

describe('syncProposalToCalendars', () => {
  it('loads the proposal and business once and hands both to each provider', async () => {
    await syncProposalToCalendars('p1');

    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    expect(mocks.findBusinessRow).toHaveBeenCalledTimes(1);
    expect(mocks.syncGoogle).toHaveBeenCalledWith(proposal, business);
    expect(mocks.syncApple).toHaveBeenCalledWith(proposal, business);
  });

  it('still syncs Apple when Google fails, and does not throw', async () => {
    mocks.syncGoogle.mockRejectedValue(new Error('google down'));

    await expect(syncProposalToCalendars('p1')).resolves.toBeUndefined();
    expect(mocks.syncApple).toHaveBeenCalled();
  });

  it('does nothing for an unknown proposal', async () => {
    mocks.findFirst.mockResolvedValue(undefined);

    await syncProposalToCalendars('nope');
    expect(mocks.syncGoogle).not.toHaveBeenCalled();
    expect(mocks.syncApple).not.toHaveBeenCalled();
  });

  it('swallows a failed load so the proposal write that triggered it never fails', async () => {
    mocks.findFirst.mockRejectedValue(new Error('db down'));

    await expect(syncProposalToCalendars('p1')).resolves.toBeUndefined();
    expect(mocks.syncGoogle).not.toHaveBeenCalled();
  });
});

describe('removeProposalFromCalendars', () => {
  it('removes from both providers using the same arguments, even if one fails', async () => {
    mocks.removeApple.mockRejectedValue(new Error('icloud down'));

    await expect(removeProposalFromCalendars(proposal)).resolves.toBeUndefined();
    expect(mocks.removeGoogle).toHaveBeenCalledWith(proposal, business);
    expect(mocks.removeApple).toHaveBeenCalledWith(proposal, business);
  });
});

import { describe, expect, it } from 'vitest';
import { calendarEventFor, shouldSync, type CalendarEvent } from './calendar-events';

const base: CalendarEvent = {
  id: 'p1',
  proposalNumber: 'WP-2026-0001',
  status: 'ACCEPTED',
  weddingDate: '2026-12-30T00:00:00.000Z',
  weddingEndDate: null,
  weddingLocation: 'Goa',
  total: 250000,
  customer: { name: 'Priya', phone: '98765' },
};

describe('shouldSync', () => {
  it('puts sent and accepted proposals on calendars, not drafts or rejections', () => {
    expect(shouldSync('SENT')).toBe(true);
    expect(shouldSync('ACCEPTED')).toBe(true);
    expect(shouldSync('DRAFT')).toBe(false);
    expect(shouldSync('REJECTED')).toBe(false);
  });
});

describe('calendarEventFor', () => {
  it('labels an accepted proposal as booked and confirmed', () => {
    const e = calendarEventFor(base);
    expect(e.summary).toBe('Priya — Booked');
    expect(e.confirmed).toBe(true);
  });

  it('labels a sent proposal as an open, tentative inquiry', () => {
    const e = calendarEventFor({ ...base, status: 'SENT' });
    expect(e.summary).toBe('Priya — Open inquiry');
    expect(e.confirmed).toBe(false);
  });

  it('ends a single-day event on the next day (exclusive end), across a year boundary', () => {
    const e = calendarEventFor(base);
    expect(e.startDate).toBe('2026-12-30');
    expect(e.endDateExclusive).toBe('2026-12-31');
    expect(calendarEventFor({ ...base, weddingDate: '2026-12-31' }).endDateExclusive).toBe('2027-01-01');
  });

  it('ends a multi-day event the day after its last day', () => {
    const e = calendarEventFor({ ...base, weddingEndDate: '2027-01-02' });
    expect(e.endDateExclusive).toBe('2027-01-03');
  });

  it('describes the proposal, and omits the phone line when there is none', () => {
    expect(calendarEventFor(base).description).toBe(
      'Proposal WP-2026-0001\nStatus: ACCEPTED\nTotal: ₹2,50,000\nPhone: 98765',
    );
    expect(calendarEventFor({ ...base, customer: { name: 'Priya', phone: null } }).description).not.toContain('Phone');
  });
});

import { describe, expect, it } from 'vitest';
import { renderCalendar, type CalendarEvent } from './calendar';

const event: CalendarEvent = {
  id: 'abc-123',
  proposalNumber: 'WP-2026-0001',
  status: 'ACCEPTED',
  weddingDate: '2026-03-31',
  weddingLocation: 'Taj Palace, Mumbai; Hall A',
  total: 250000,
  customer: { name: 'Priya, Rahul', phone: '+91 98765 43210' },
};

describe('renderCalendar', () => {
  const ics = renderCalendar('Wedding Tapes', [event]);

  it('wraps events in a valid calendar envelope', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:abc-123@wedding-tapes');
  });

  it('makes an all-day event ending the next day', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260331');
    expect(ics).toContain('DTEND;VALUE=DATE:20260401');
  });

  it('escapes commas and semicolons in text fields', () => {
    expect(ics).toContain('Taj Palace\\, Mumbai\\; Hall A');
    expect(ics).toContain('Priya\\, Rahul');
  });

  it('marks accepted as confirmed and sent as tentative', () => {
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(renderCalendar('x', [{ ...event, status: 'SENT' }])).toContain('STATUS:TENTATIVE');
  });

  it('keeps every content line within 75 octets', () => {
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
  });
});

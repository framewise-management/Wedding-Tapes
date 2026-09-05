import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, proposals } from '../db/schema';
import { NotFoundError } from '../lib/http-error';

// Mirrors the Calendar page: DRAFT hasn't gone out yet, REJECTED frees the date.
const FEED_STATUSES = ['SENT', 'ACCEPTED'] as const;

export async function getOrCreateCalendarToken(businessId: string): Promise<string> {
  const business = await db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
  if (!business) throw new NotFoundError('Business not found');
  if (business.calendarToken) return business.calendarToken;

  const token = randomUUID();
  await db.update(businesses).set({ calendarToken: token }).where(eq(businesses.id, businessId));
  return token;
}

function escapeText(value: string): string {
  return value.replace(/[\\;,]/g, (ch) => '\\' + ch).replace(/\r?\n/g, '\\n');
}

// RFC 5545 caps a content line at 75 octets; longer lines continue with a leading space.
function fold(line: string): string {
  const chunks: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let take = 75;
    while (Buffer.byteLength(rest.slice(0, take)) > 75) take--;
    chunks.push(rest.slice(0, take));
    rest = rest.slice(take);
    take = 74;
  }
  chunks.push(rest);
  return chunks.join('\r\n ');
}

function dateOnly(value: string): string {
  return value.slice(0, 10).replace(/-/g, '');
}

function nextDay(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dateOnly(d.toISOString());
}

export interface CalendarEvent {
  id: string;
  proposalNumber: string;
  status: string;
  weddingDate: string;
  weddingLocation: string;
  total: number;
  customer: { name: string; phone: string | null };
}

function stampNow(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function eventLines(p: CalendarEvent, stamp: string): string[] {
  const label = p.status === 'ACCEPTED' ? 'Booked' : 'Open inquiry';
  return [
    'BEGIN:VEVENT',
    `UID:${p.id}@wedding-tapes`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateOnly(p.weddingDate)}`,
    `DTEND;VALUE=DATE:${nextDay(p.weddingDate)}`,
    fold(`SUMMARY:${escapeText(`${p.customer.name} — ${label}`)}`),
    fold(`LOCATION:${escapeText(p.weddingLocation)}`),
    fold(
      `DESCRIPTION:${escapeText(
        [
          `Proposal ${p.proposalNumber}`,
          `Status: ${p.status}`,
          `Total: ₹${Number(p.total).toLocaleString('en-IN')}`,
          p.customer.phone ? `Phone: ${p.customer.phone}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )}`,
    ),
    p.status === 'ACCEPTED' ? 'STATUS:CONFIRMED' : 'STATUS:TENTATIVE',
    'END:VEVENT',
  ];
}

export function renderCalendar(calendarName: string, rows: CalendarEvent[]): string {
  const stamp = stampNow();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Tapes//Proposals//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ];

  for (const p of rows) lines.push(...eventLines(p, stamp));

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * One VEVENT as a standalone CalDAV resource. RFC 4791 §4.1 forbids METHOD on a
 * calendar object resource, so this can't reuse renderCalendar's PUBLISH header.
 */
export function renderEventDocument(p: CalendarEvent): string {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Tapes//Proposals//EN',
      'CALSCALE:GREGORIAN',
      ...eventLines(p, stampNow()),
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'
  );
}

export async function buildCalendarFeed(token: string): Promise<string> {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.calendarToken, token),
  });
  if (!business) throw new NotFoundError('Calendar not found');

  const rows = await db.query.proposals.findMany({
    where: and(eq(proposals.businessId, business.id), inArray(proposals.status, [...FEED_STATUSES])),
    with: { customer: true },
  });

  return renderCalendar(business.name, rows);
}

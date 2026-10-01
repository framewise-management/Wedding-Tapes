import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, proposals } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import { calendarEventFor, SYNCED_STATUSES, type CalendarEvent } from './calendar-events';
import { findBusinessRow } from './business';

export type { CalendarEvent };

export async function getOrCreateCalendarToken(businessId: string): Promise<string> {
  const business = await findBusinessRow(businessId);
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

function stampNow(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function eventLines(p: CalendarEvent, stamp: string): string[] {
  const e = calendarEventFor(p);
  return [
    'BEGIN:VEVENT',
    `UID:${p.id}@wedding-tapes`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateOnly(e.startDate)}`,
    `DTEND;VALUE=DATE:${dateOnly(e.endDateExclusive)}`,
    fold(`SUMMARY:${escapeText(e.summary)}`),
    fold(`LOCATION:${escapeText(e.location)}`),
    fold(`DESCRIPTION:${escapeText(e.description)}`),
    e.confirmed ? 'STATUS:CONFIRMED' : 'STATUS:TENTATIVE',
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
    where: and(eq(proposals.businessId, business.id), inArray(proposals.status, [...SYNCED_STATUSES])),
    with: { customer: true },
  });

  return renderCalendar(business.name, rows);
}

import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { businesses, proposals } from '../db/schema';
import { NotFoundError } from '../lib/http-error';
import { calendarEventFor, SYNCED_STATUSES, type CalendarEvent } from './calendar-events';
import type { BusinessService } from './business';

export type { CalendarEvent };


export class CalendarFeedService {
  constructor(
    private readonly db: Db,
    private readonly business: BusinessService,
  ) {}

  async getOrCreateToken(businessId: string): Promise<string> {
    const business = await this.business.findRow(businessId);
    if (business.calendarToken) return business.calendarToken;
  
    const token = randomUUID();
    await this.db.update(businesses).set({ calendarToken: token }).where(eq(businesses.id, businessId));
    return token;
  }
  

  private escapeText(value: string): string {
    return value.replace(/[\\;,]/g, (ch) => '\\' + ch).replace(/\r?\n/g, '\\n');
  }
  

  // RFC 5545 caps a content line at 75 octets; longer lines continue with a leading space.
  private fold(line: string): string {
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
  

  private dateOnly(value: string): string {
    return value.slice(0, 10).replace(/-/g, '');
  }
  

  private stampNow(): string {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  

  private eventLines(p: CalendarEvent, stamp: string): string[] {
    const e = calendarEventFor(p);
    return [
      'BEGIN:VEVENT',
      `UID:${p.id}@wedding-tapes`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${this.dateOnly(e.startDate)}`,
      `DTEND;VALUE=DATE:${this.dateOnly(e.endDateExclusive)}`,
      this.fold(`SUMMARY:${this.escapeText(e.summary)}`),
      this.fold(`LOCATION:${this.escapeText(e.location)}`),
      this.fold(`DESCRIPTION:${this.escapeText(e.description)}`),
      e.confirmed ? 'STATUS:CONFIRMED' : 'STATUS:TENTATIVE',
      'END:VEVENT',
    ];
  }
  

  render(calendarName: string, rows: CalendarEvent[]): string {
    const stamp = this.stampNow();
  
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Tapes//Proposals//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(calendarName)}`,
      'X-PUBLISHED-TTL:PT1H',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ];
  
    for (const p of rows) lines.push(...this.eventLines(p, stamp));
  
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
  
  /**
   * One VEVENT as a standalone CalDAV resource. RFC 4791 §4.1 forbids METHOD on a
   * calendar object resource, so this can't reuse renderCalendar's PUBLISH header.
   */

  renderEvent(p: CalendarEvent): string {
    return (
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Wedding Tapes//Proposals//EN',
        'CALSCALE:GREGORIAN',
        ...this.eventLines(p, this.stampNow()),
        'END:VCALENDAR',
      ].join('\r\n') + '\r\n'
    );
  }
  

  async buildFeed(token: string): Promise<string> {
    const business = await this.db.query.businesses.findFirst({
      where: eq(businesses.calendarToken, token),
    });
    if (!business) throw new NotFoundError('Calendar not found');
  
    const rows = await this.db.query.proposals.findMany({
      where: and(eq(proposals.businessId, business.id), inArray(proposals.status, [...SYNCED_STATUSES])),
      with: { customer: true },
    });
  
    return this.render(business.name, rows);
  }
}


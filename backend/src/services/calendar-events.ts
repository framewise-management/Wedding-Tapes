// DRAFT hasn't gone out yet and REJECTED frees the date, so neither belongs on a calendar.
export const SYNCED_STATUSES = ['SENT', 'ACCEPTED'] as const;

export function shouldSync(status: string): boolean {
  return (SYNCED_STATUSES as readonly string[]).includes(status);
}

export interface CalendarEvent {
  id: string;
  proposalNumber: string;
  status: string;
  weddingDate: string;
  weddingEndDate: string | null;
  weddingLocation: string;
  total: number;
  customer: { name: string; phone: string | null };
}

function isoDate(value: string): string {
  return value.slice(0, 10);
}

function nextDay(value: string): string {
  const d = new Date(`${isoDate(value)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function calendarEventFor(p: CalendarEvent) {
  const confirmed = p.status === 'ACCEPTED';
  return {
    summary: `${p.customer.name} — ${confirmed ? 'Booked' : 'Open inquiry'}`,
    location: p.weddingLocation,
    description: [
      `Proposal ${p.proposalNumber}`,
      `Status: ${p.status}`,
      `Total: ₹${Number(p.total).toLocaleString('en-IN')}`,
      p.customer.phone ? `Phone: ${p.customer.phone}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    confirmed,
    startDate: isoDate(p.weddingDate),
    endDateExclusive: nextDay(p.weddingEndDate ?? p.weddingDate),
  };
}

export interface DatedEvent {
  date: string;
}

export interface DerivedEventFields {
  weddingDate: string;
  weddingEndDate: string | null;
  numberOfDays: number;
}

/**
 * The proposal's own date columns stay the source of truth for the calendar,
 * PDF and history list, so they are always recomputed from the events rather
 * than entered by hand: earliest date wins, latest becomes the span end, and
 * the day count ignores two ceremonies sharing one date.
 */
export function deriveEventFields(events: DatedEvent[]): DerivedEventFields {
  const dates = events.map((e) => e.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  return {
    weddingDate: first,
    weddingEndDate: last === first ? null : last,
    numberOfDays: new Set(dates).size,
  };
}

export function sortByDate<T extends DatedEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

import { describe, expect, it } from 'vitest';
import { deriveEventFields, sortByDate } from './event-dates';

describe('deriveEventFields', () => {
  it('leaves the span end null for a single event', () => {
    expect(deriveEventFields([{ date: '2026-02-13' }])).toEqual({
      weddingDate: '2026-02-13',
      weddingEndDate: null,
      numberOfDays: 1,
    });
  });

  it('takes the earliest and latest date regardless of input order', () => {
    expect(
      deriveEventFields([
        { date: '2026-02-14' },
        { date: '2026-02-12' },
        { date: '2026-02-13' },
      ]),
    ).toEqual({ weddingDate: '2026-02-12', weddingEndDate: '2026-02-14', numberOfDays: 3 });
  });

  it('counts distinct dates, not events', () => {
    const derived = deriveEventFields([
      { date: '2026-02-12' },
      { date: '2026-02-12' },
      { date: '2026-02-13' },
    ]);
    expect(derived.numberOfDays).toBe(2);
    expect(derived.weddingEndDate).toBe('2026-02-13');
  });
});

describe('sortByDate', () => {
  it('orders events by date without mutating the input', () => {
    const input = [{ date: '2026-02-14', name: 'Reception' }, { date: '2026-02-12', name: 'Haldi' }];
    expect(sortByDate(input).map((e) => e.name)).toEqual(['Haldi', 'Reception']);
    expect(input[0].name).toBe('Reception');
  });
});

/**
 * "18 March 2026" for one day; "18 – 21 March 2026" within a month, else both
 * ends in full. Takes the caller's own formatter so each screen keeps its
 * existing long/short month style.
 */
export function formatDateRange(
  start: string,
  end: string | null,
  format: (value: string) => string,
): string {
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return format(start);
  const from = new Date(start);
  const to = new Date(end);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  return `${sameMonth ? from.getDate() : format(start)} – ${format(end)}`;
}

/** Every ISO date the proposal covers, so a multi-day event fills each cell. */
export function datesInRange(start: string, end: string | null): string[] {
  const first = start.slice(0, 10);
  const keys = [first];
  const last = end?.slice(0, 10);
  if (!last || last <= first) return keys;
  const cursor = new Date(`${first}T00:00:00Z`);
  while (keys[keys.length - 1] < last) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    keys.push(cursor.toISOString().slice(0, 10));
  }
  return keys;
}

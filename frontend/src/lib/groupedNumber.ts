export function stripToDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export function formatGroupedDigits(value: string | number | null | undefined): string {
  const digits = value === null || value === undefined ? '' : String(value).replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-IN');
}

export function parseGroupedNumber(raw: string): number | null {
  const digits = stripToDigits(raw);
  if (!digits) return null;
  return Number(digits);
}

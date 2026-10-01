export function money(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Drizzle wraps driver errors in a DrizzleQueryError and hangs the real
// postgres-js error (with its SQLSTATE) off `cause`, so the code is never on
// the thrown error itself.
export function isPgError(err: unknown, code: string): boolean {
  for (let cur: unknown = err; cur instanceof Error; cur = cur.cause) {
    if ((cur as { code?: string }).code === code) return true;
  }
  return false;
}

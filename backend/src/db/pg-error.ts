export function isPgError(err: unknown, code: string): boolean {
  return err instanceof Error && (err as { code?: string }).code === code;
}

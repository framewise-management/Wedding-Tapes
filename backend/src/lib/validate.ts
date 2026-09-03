import type { Context } from 'hono';
import type { ZodType } from 'zod';
import { BadRequestError } from './http-error';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Zod's default object behavior strips unknown keys without erroring,
// matching NestJS's ValidationPipe({ whitelist: true }) -- do not add
// .strict() here.
export async function parseBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    json = {};
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new BadRequestError(result.error.issues[0].message);
  }
  return result.data;
}

export function parseQuery<T>(c: Context, schema: ZodType<T>): T {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new BadRequestError(result.error.issues[0].message);
  }
  return result.data;
}

export function parseUuidParam(c: Context, name: string): string {
  const value = c.req.param(name);
  if (!value || !UUID_RE.test(value)) {
    throw new BadRequestError('Validation failed (uuid is expected)');
  }
  return value;
}

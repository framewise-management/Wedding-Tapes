import type { ErrorHandler } from 'hono';
import { HttpError } from '../lib/http-error';

// Code is derived purely from HTTP status, matching the previous
// NestJS HttpExceptionFilter -- never from the error class.
const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export const errorHandler: ErrorHandler = (err, c) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : 'Internal server error';
  const code = STATUS_CODES[status] ?? 'INTERNAL_ERROR';
  return c.json({ error: { code, message } }, status as 400 | 401 | 403 | 404 | 409 | 500);
};

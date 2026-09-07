import { describe, expect, it } from 'vitest';
import { isPgError } from './pg-error';

function wrap(cause: Error): Error {
  return new Error('Failed query: ...', { cause });
}

function pgError(code: string): Error {
  return Object.assign(new Error('duplicate key value'), { code });
}

describe('isPgError', () => {
  it('matches the code on the error itself', () => {
    expect(isPgError(pgError('23505'), '23505')).toBe(true);
  });

  it('matches the code on a wrapped cause', () => {
    expect(isPgError(wrap(pgError('23503')), '23503')).toBe(true);
  });

  it('rejects a different code', () => {
    expect(isPgError(wrap(pgError('23505')), '23503')).toBe(false);
  });

  it('rejects a non-error and an error with no code', () => {
    expect(isPgError('boom', '23505')).toBe(false);
    expect(isPgError(new Error('boom'), '23505')).toBe(false);
  });
});

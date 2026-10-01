import { describe, expect, it } from 'vitest';
import { listProposalsQuerySchema } from './proposals';

describe('listProposalsQuerySchema archived filter', () => {
  it('leaves archived undefined when absent so nothing is filtered', () => {
    expect(listProposalsQuerySchema.parse({}).archived).toBeUndefined();
  });

  it('parses only the literal "true" as true', () => {
    expect(listProposalsQuerySchema.parse({ archived: 'true' }).archived).toBe(true);
    expect(listProposalsQuerySchema.parse({ archived: 'false' }).archived).toBe(false);
  });
});

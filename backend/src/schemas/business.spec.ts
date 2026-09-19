import { describe, expect, it } from 'vitest';
import { updateBusinessSchema } from './business';

describe('paymentConditions', () => {
  it('accepts instalments totalling 100%', () => {
    const r = updateBusinessSchema.safeParse({
      paymentConditions: [
        { label: 'On booking', percent: 50 },
        { label: 'Before delivery', percent: 50 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects instalments that do not total 100%', () => {
    const r = updateBusinessSchema.safeParse({
      paymentConditions: [{ label: 'On booking', percent: 40 }],
    });
    expect(r.success).toBe(false);
  });

  it('accepts an empty list (no conditions configured)', () => {
    expect(updateBusinessSchema.safeParse({ paymentConditions: [] }).success).toBe(true);
  });
});

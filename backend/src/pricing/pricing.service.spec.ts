import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const pricing = new PricingService();

  it('sums multiple packages into the subtotal', () => {
    const result = pricing.calculate({
      packages: [
        { quantity: 1, unitPrice: 80000 },
        { quantity: 1, unitPrice: 60000 },
      ],
      items: [],
      discountType: null,
      discountValue: null,
      taxRate: 0,
    });
    expect(result.subtotal).toBe(140000);
    expect(result.total).toBe(140000);
  });

  it('excludes optional items from the subtotal but keeps included ones', () => {
    const result = pricing.calculate({
      packages: [],
      items: [
        { quantity: 1, unitPrice: 18000, isOptional: false },
        { quantity: 1, unitPrice: 25000, isOptional: true },
      ],
      discountType: null,
      discountValue: null,
      taxRate: 0,
    });
    expect(result.subtotal).toBe(18000);
    expect(result.total).toBe(18000);
  });

  it('applies a percentage discount (SRS Â§11 example: â‚¹1,20,000 âˆ’ 10% â†’ â‚¹1,08,000)', () => {
    const result = pricing.calculate({
      packages: [{ quantity: 1, unitPrice: 120000 }],
      items: [],
      discountType: 'PERCENTAGE',
      discountValue: 10,
      taxRate: 0,
    });
    expect(result.subtotal).toBe(120000);
    expect(result.discountAmount).toBe(12000);
    expect(result.total).toBe(108000);
  });

  it('applies a fixed discount', () => {
    const result = pricing.calculate({
      packages: [{ quantity: 1, unitPrice: 50000 }],
      items: [],
      discountType: 'FIXED',
      discountValue: 5000,
      taxRate: 0,
    });
    expect(result.discountAmount).toBe(5000);
    expect(result.total).toBe(45000);
  });

  it('clamps a fixed discount larger than the subtotal to 0, never going negative', () => {
    const result = pricing.calculate({
      packages: [{ quantity: 1, unitPrice: 10000 }],
      items: [],
      discountType: 'FIXED',
      discountValue: 999999,
      taxRate: 0,
    });
    expect(result.discountAmount).toBe(10000);
    expect(result.total).toBe(0);
  });

  it('defaults to 0% tax when no rate is given', () => {
    const result = pricing.calculate({
      packages: [{ quantity: 1, unitPrice: 10000 }],
      items: [],
      discountType: null,
      discountValue: null,
      taxRate: 0,
    });
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(10000);
  });

  it('applies tax to the post-discount amount (FR-013 example: 1,00,000 âˆ’ 5,000 discount, 18% tax â†’ 1,12,100)', () => {
    const result = pricing.calculate({
      packages: [{ quantity: 1, unitPrice: 100000 }],
      items: [],
      discountType: 'FIXED',
      discountValue: 5000,
      taxRate: 18,
    });
    expect(result.discountAmount).toBe(5000);
    expect(result.taxAmount).toBe(17100);
    expect(result.total).toBe(112100);
  });
});

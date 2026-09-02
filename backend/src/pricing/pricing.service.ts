import { Injectable } from '@nestjs/common';

export type DiscountType = 'FIXED' | 'PERCENTAGE';

export interface PricingLineItem {
  quantity: number;
  unitPrice: number;
  isOptional?: boolean;
}

export interface PricingInput {
  packages: PricingLineItem[];
  items: PricingLineItem[];
  discountType: DiscountType | null;
  discountValue: number | null;
  taxRate: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/**
 * SRS §17: packageTotal + serviceTotal(excluding optional) = subtotal;
 * discount clamped so it never exceeds subtotal; tax applies to the
 * post-discount (taxable) amount, not the raw subtotal.
 */
@Injectable()
export class PricingService {
  calculate(input: PricingInput): PricingResult {
    const packageTotal = input.packages.reduce(
      (sum, p) => sum + p.quantity * p.unitPrice,
      0,
    );
    const serviceTotal = input.items
      .filter((i) => !i.isOptional)
      .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const subtotal = packageTotal + serviceTotal;

    const rawDiscount = this.calculateDiscount(
      subtotal,
      input.discountType,
      input.discountValue,
    );
    const discountAmount = Math.min(Math.max(rawDiscount, 0), subtotal);

    const taxableAmount = subtotal - discountAmount;
    const taxRate = Math.max(input.taxRate ?? 0, 0);
    const taxAmount = Math.round((taxableAmount * taxRate) / 100);
    const total = taxableAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  }

  private calculateDiscount(
    subtotal: number,
    type: DiscountType | null,
    value: number | null,
  ): number {
    if (!type || !value) return 0;
    if (type === 'FIXED') return value;
    return Math.round((subtotal * value) / 100);
  }
}

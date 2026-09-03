import type { Customer } from './customer';

export interface ProposalPackage {
  id: string;
  packageId: string;
  packageName: string;
  packageDescription: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProposalItem {
  id: string;
  serviceId: string;
  serviceName: string;
  description: string | null;
  priceType: 'per_day' | 'flat';
  quantity: number;
  unitPrice: number;
  total: number;
  isOptional: boolean;
}

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface Proposal {
  id: string;
  customerId: string;
  customer: Customer;
  proposalNumber: string;
  weddingDate: string;
  weddingLocation: string;
  numberOfDays: number | null;
  status: ProposalStatus;
  subtotal: number;
  discountType: 'FIXED' | 'PERCENTAGE' | null;
  discountValue: number | null;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  shareViewCount: number;
  packages: ProposalPackage[];
  items: ProposalItem[];
  createdAt: string;
  updatedAt: string;
}

import type { Customer } from './customer';

export interface ProposalPackage {
  id: string;
  proposalEventId: string | null;
  packageId: string;
  packageName: string;
  packageDescription: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProposalItem {
  id: string;
  proposalEventId: string | null;
  serviceId: string;
  serviceName: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  isOptional: boolean;
}

export interface ProposalEvent {
  id: string;
  eventTypeId: string | null;
  name: string;
  date: string;
  location: string | null;
}

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
export type ProposalTemplate = 'DARK_LUXE' | 'BRIGHT_MODERN' | 'EDITORIAL';

export interface Proposal {
  id: string;
  customerId: string;
  customer: Customer;
  proposalNumber: string;
  weddingDate: string;
  weddingEndDate: string | null;
  weddingLocation: string;
  numberOfDays: number | null;
  status: ProposalStatus;
  template: ProposalTemplate;
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
  events: ProposalEvent[];
  packages: ProposalPackage[];
  items: ProposalItem[];
  createdAt: string;
  updatedAt: string;
}

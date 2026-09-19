import type { Term } from './term';

export interface Business {
  id: string;
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  appleId: string | null;
  appleConnected: boolean;
  appleCredentialSaved: boolean;
  googleCalendarId: string | null;
  defaultValidityDays: number | null;
  defaultTerms: string | null;
  terms: Term[];
  bankDetails: string | null;
  upiId: string | null;
  paymentNotes: string | null;
  paymentConditions: PaymentCondition[] | null;
  paymentModes: PaymentMode[] | null;
  gstNumber: string | null;
  invoicePrefix: string | null;
  invoiceNextNumber: number | null;
  receiptPrefix: string | null;
  receiptNextNumber: number | null;
}

export type PaymentMode = 'UPI' | 'BANK' | 'CASH' | 'CHEQUE' | 'CARD';
export interface PaymentCondition {
  label: string;
  percent: number;
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  UPI: 'UPI',
  BANK: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
};

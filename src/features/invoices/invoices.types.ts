export type InvoiceType = 'COMMISSION' | 'FEATURE' | 'DEPOSIT_FORFEIT';

export interface InvoiceDTO {
  id: string;
  number: string;
  type: InvoiceType | string;
  totalPaise: number;
  /** GST tax invoice when true, otherwise a receipt. */
  isTaxInvoice: boolean;
  issuedAt: string;
}

/** `GET /admin/invoices` row: the member's id plus the buyer snapshot printed on the invoice. */
export interface AdminInvoice extends InvoiceDTO {
  memberId: string;
  /** Buyer name as invoiced (snapshot at issue time). */
  buyerName: string | null;
  buyerGstin: string | null;
  taxablePaise: number;
}

export const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'FEATURE', label: 'Promotion' },
  { value: 'DEPOSIT_FORFEIT', label: 'Forfeited deposit' },
];

export function invoiceTypeLabel(t: string): string {
  return INVOICE_TYPES.find((x) => x.value === t)?.label ?? t;
}

export interface InvoiceSettings {
  legalName: string;
  gstin: string;
  address: string;
  stateCode: string;
  gstRateBps: number;
  commissionInclusive: boolean;
  sacCode: string;
}

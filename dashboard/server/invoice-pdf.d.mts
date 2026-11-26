export type InvoicePdfInput = {
  invoice: { invoice_number: string; customer_name?: string | null; issued_on: string; period_start?: string | null; period_end?: string | null; amount_gbp: number | string };
  lines: { line_date?: string | null; quantity: number | string; quantity_label?: string | null; description: string; unit_price: number | string; amount: number | string }[];
  customer: { name?: string | null; payment_terms_days?: number | null } | null;
  placement: { placement_address?: string | null; young_person_initials?: string | null; usn?: string | null; social_worker?: string | null } | null;
  settings: {
    company_name?: string; trading_name?: string; address?: string; company_number?: string; website?: string;
    queries_email?: string; bank_name?: string; account_name?: string; account_number?: string; sort_code?: string; thanks_line?: string;
  };
  logo?: Uint8Array | ArrayBuffer | null;
};

export function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array>;
export function invoiceFileName(invoice: { invoice_number: string }): string;
export function ukDate(value?: string | null): string;

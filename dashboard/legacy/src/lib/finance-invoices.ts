import { zipSync } from "fflate";
import { buildInvoicePdf, invoiceFileName } from "../../../server/invoice-pdf.mjs";
import { supabase } from "../../../src/shims/supabase";

export type Customer = { id: string; name: string; billing_email: string | null; contact_name: string | null; payment_terms_days: number; active: boolean; notes: string; version: number };
export type StandardLine = { description: string; unit_price: number; basis: "monday" | "fixed"; quantity?: number; quantity_label?: string };
export type Placement = {
  id: string; customer_id: string; home_id: string | null; young_person_initials: string; usn: string | null; social_worker: string | null;
  placement_address: string | null; start_on: string | null; end_on: string | null; active: boolean; standard_lines: StandardLine[]; notes: string; version: number;
};
export type Invoice = {
  id: string; invoice_number: string; customer_name: string; customer_id: string | null; placement_id: string | null; home_id: string | null;
  period_month: string | null; period_start: string | null; period_end: string | null; issued_on: string; due_on: string;
  amount_gbp: number; received_gbp: number; last_received_on: string | null; notes: string; status: "Draft" | "Approved" | "Sent";
  approved_at: string | null; sent_at: string | null; sent_to: string | null; version: number;
};
export type InvoiceLine = {
  id: string; invoice_id: string; position: number; line_date: string | null; quantity: number; quantity_label: string | null;
  description: string; unit_price: number; amount: number;
};
export type FinanceSettings = {
  id: string; company_name: string; trading_name: string; address: string; company_number: string; website: string; queries_email: string;
  bank_name: string; account_name: string; account_number: string; sort_code: string; thanks_line: string; version: number;
};
export type InvoiceStatus = "Draft" | "Approved" | "Sent" | "Part paid" | "Paid" | "Overdue";

/** Workflow state until it is sent; after that, where the payment stands. */
export function invoiceStatus(invoice: Pick<Invoice, "status" | "amount_gbp" | "received_gbp" | "due_on">, today: string): InvoiceStatus {
  if (invoice.status !== "Sent") return invoice.status;
  const amount = Number(invoice.amount_gbp), received = Number(invoice.received_gbp);
  if (amount > 0 && received >= amount) return "Paid";
  if (invoice.due_on < today) return "Overdue";
  return received > 0 ? "Part paid" : "Sent";
}

export function invoiceStatusTone(status: InvoiceStatus) {
  return {
    Draft: "bg-slate-100 text-slate-700",
    Approved: "bg-sky-100 text-sky-900",
    Sent: "bg-indigo-100 text-indigo-900",
    "Part paid": "bg-amber-100 text-amber-900",
    Paid: "bg-emerald-100 text-emerald-900",
    Overdue: "bg-rose-100 text-rose-900",
  }[status];
}

/** Mondays in the month of an ISO date (weekly allowances are paid on Mondays). */
export function mondaysInMonth(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1) count += 1;
  return count;
}

export function monthLabel(isoDate: string | null) {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate.slice(0, 7)}-01T12:00:00Z`));
}

export const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** Standard lines as they would appear on a given month's invoice (used to preview a placement). */
export function previewStandardLines(lines: StandardLine[], isoMonth: string) {
  const mondays = mondaysInMonth(isoMonth);
  return lines.map(line => {
    const quantity = line.basis === "monday" ? mondays : Number(line.quantity ?? 1);
    return { ...line, quantity, amount: Math.round(quantity * Number(line.unit_price) * 100) / 100 };
  });
}

export function sumLines(lines: Pick<InvoiceLine, "quantity" | "unit_price">[]) {
  return Math.round(lines.reduce((total, line) => total + Number(line.quantity) * Number(line.unit_price), 0) * 100) / 100;
}

let logoCache: Uint8Array | null = null;
async function invoiceLogo() {
  if (logoCache) return logoCache;
  const response = await fetch("/pearl-invoice-logo.png");
  logoCache = response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  return logoCache;
}

/** Builds the PDF for each invoice from what the signed-in user can read. */
export async function invoicePdfs(invoiceIds: string[]) {
  const [invoices, lines, settings] = await Promise.all([
    supabase.from("finance_invoices").select("*").in("id", invoiceIds),
    supabase.from("finance_invoice_lines").select("*").in("invoice_id", invoiceIds).order("position"),
    supabase.from("finance_settings").select("*").maybeSingle(),
  ]);
  if (invoices.error || lines.error || settings.error || !settings.data) throw new Error(invoices.error?.message ?? lines.error?.message ?? settings.error?.message ?? "Invoice settings are missing.");
  const rows = (invoices.data ?? []) as Invoice[];
  const customerIds = [...new Set(rows.map(row => row.customer_id).filter(Boolean))] as string[];
  const placementIds = [...new Set(rows.map(row => row.placement_id).filter(Boolean))] as string[];
  const [customers, placements] = await Promise.all([
    customerIds.length ? supabase.from("finance_customers").select("*").in("id", customerIds) : Promise.resolve({ data: [], error: null }),
    placementIds.length ? supabase.from("finance_placements").select("*").in("id", placementIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const logo = await invoiceLogo();
  const files: { name: string; bytes: Uint8Array }[] = [];
  for (const invoice of rows) {
    const bytes = await buildInvoicePdf({
      invoice,
      lines: ((lines.data ?? []) as InvoiceLine[]).filter(line => line.invoice_id === invoice.id),
      customer: ((customers.data ?? []) as Customer[]).find(row => row.id === invoice.customer_id) ?? null,
      placement: ((placements.data ?? []) as Placement[]).find(row => row.id === invoice.placement_id) ?? null,
      settings: settings.data as FinanceSettings,
      logo,
    });
    files.push({ name: invoiceFileName(invoice), bytes });
  }
  return files;
}

function saveFile(name: string, bytes: Uint8Array, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One invoice downloads as a PDF; several download together as a .zip. */
export async function downloadInvoices(invoiceIds: string[], zipName = "Pearl Connexions invoices.zip") {
  const files = await invoicePdfs(invoiceIds);
  if (files.length === 1) { saveFile(files[0].name, files[0].bytes, "application/pdf"); return; }
  saveFile(zipName, zipSync(Object.fromEntries(files.map(file => [file.name, file.bytes]))), "application/zip");
}

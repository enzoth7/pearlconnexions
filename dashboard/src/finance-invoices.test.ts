import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildInvoicePdf, invoiceFileName, ukDate } from "../server/invoice-pdf.mjs";
import { invoiceStatus, mondaysInMonth, previewStandardLines, sumLines } from "@/lib/finance-invoices";

const settings = { company_name: "Pearl Connexions PC CIC", trading_name: "Pearl Connexions Care Services", address: "24 Totterdown Street London SW17 8TA", company_number: "13294525", queries_email: "finance@example.org", bank_name: "Example Bank", account_name: "Example", account_number: "00000000", sort_code: "00-00-00" };
const invoice = { invoice_number: "PCTST1126", issued_on: "2026-11-26", period_start: "2026-11-01", period_end: "2026-11-30", amount_gbp: 391.6 };
const line = (description: string, quantity: number, unit_price: number) => ({ line_date: "2026-11-01", quantity, quantity_label: null, description, unit_price, amount: quantity * unit_price });

describe("council invoice rules", () => {
  it("counts the Mondays that weekly allowances are paid on", () => {
    expect(mondaysInMonth("2026-11-01")).toBe(5);
    expect(mondaysInMonth("2026-12-15")).toBe(4);
    expect(mondaysInMonth("2026-02-01")).toBe(4);
  });

  it("prices the standard lines for a month (the PCJAP1126 case adds up to £391.60)", () => {
    const lines = previewStandardLines([
      { description: "Subsistence", unit_price: 58.32, basis: "monday" },
      { description: "Hair & Clothing", unit_price: 100, basis: "fixed", quantity: 1 },
    ], "2026-11-01");
    expect(lines.map(item => [item.quantity, item.amount])).toEqual([[5, 291.6], [1, 100]]);
    expect(sumLines(lines)).toBe(391.6);
  });

  it("shows the workflow until sent, then where the payment stands", () => {
    const base = { amount_gbp: 400, received_gbp: 0, due_on: "2026-12-01" };
    expect(invoiceStatus({ ...base, status: "Draft" }, "2026-11-26")).toBe("Draft");
    expect(invoiceStatus({ ...base, status: "Approved" }, "2026-12-20")).toBe("Approved");
    expect(invoiceStatus({ ...base, status: "Sent" }, "2026-11-26")).toBe("Sent");
    expect(invoiceStatus({ ...base, status: "Sent", received_gbp: 100 }, "2026-11-26")).toBe("Part paid");
    expect(invoiceStatus({ ...base, status: "Sent", received_gbp: 400 }, "2026-12-20")).toBe("Paid");
    expect(invoiceStatus({ ...base, status: "Sent" }, "2026-12-02")).toBe("Overdue");
  });
});

describe("invoice PDF", () => {
  it("builds a one-page PDF with a safe file name", async () => {
    const bytes = await buildInvoicePdf({
      invoice, settings, logo: null,
      lines: [{ ...line("Subsistence", 5, 58.32), quantity_label: "Monday x5" }, line("Hair & Clothing", 1, 100)],
      customer: { name: "Example Council", payment_terms_days: 5 },
      placement: { placement_address: "1 Example Road", young_person_initials: "TST", usn: "000000", social_worker: "Sample Worker" },
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    expect(invoiceFileName({ invoice_number: "PCJAP1126/2" })).toBe("Pearl Connexions Invoice PCJAP1126_2.pdf");
    expect(ukDate("2026-11-01")).toBe("01/11/2026");
  });

  it("continues on a second page when there are many lines", async () => {
    const many = Array.from({ length: 30 }, (_, index) => line(`Session ${index + 1} with a longer description that wraps onto a second row in the table`, 1, 10));
    const bytes = await buildInvoicePdf({ invoice: { ...invoice, amount_gbp: 300 }, lines: many, customer: null, placement: null, settings, logo: null });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
});

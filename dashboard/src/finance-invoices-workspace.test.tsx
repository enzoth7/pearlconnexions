// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const tables: Record<string, unknown[]> = {
  finance_invoices: [
    { id: "i1", invoice_number: "PCTST1126", customer_name: "Example Council", customer_id: "c1", placement_id: "p1", home_id: "h1", period_month: "2026-11-01", period_start: "2026-11-01", period_end: "2026-11-30", issued_on: "2026-11-26", due_on: "2026-12-01", amount_gbp: 391.6, received_gbp: 0, last_received_on: null, notes: "", status: "Draft", approved_at: null, sent_at: null, sent_to: null, version: 3 },
    { id: "i2", invoice_number: "PCTST1026", customer_name: "Example Council", customer_id: "c1", placement_id: "p1", home_id: "h1", period_month: "2026-10-01", period_start: "2026-10-01", period_end: "2026-10-31", issued_on: "2026-10-01", due_on: "2026-10-06", amount_gbp: 333.28, received_gbp: 333.28, last_received_on: "2026-10-05", notes: "", status: "Sent", approved_at: null, sent_at: "2026-10-01T09:00:00Z", sent_to: "billing@example.org", version: 5 },
  ],
  finance_customers: [{ id: "c1", name: "Example Council", billing_email: null, contact_name: null, payment_terms_days: 5, active: true, notes: "", version: 1 }],
  finance_placements: [{ id: "p1", customer_id: "c1", home_id: "h1", young_person_initials: "TST", usn: "000000", social_worker: null, placement_address: null, start_on: null, end_on: null, active: true, standard_lines: [{ description: "Subsistence", unit_price: 58.32, basis: "monday" }], notes: "", version: 1 }],
  qa_homes: [{ id: "h1", name: "Hematite House" }],
  finance_settings: [{ id: "s1", company_name: "Pearl Connexions PC CIC", trading_name: "", address: "", company_number: "", website: "", queries_email: "finance@example.org", bank_name: "", account_name: "", account_number: "", sort_code: "", thanks_line: "", version: 1 }],
  record_attachments: [{ entity_id: "i2" }],
  profiles: [{ role: "manager" }],
};

// Minimal Supabase query builder: every chain resolves to the table's rows.
function query(table: string) {
  const rows = tables[table] ?? [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "in"]) chain[method] = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: rows[0] ?? null, error: null });
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: rows, error: null });
  return chain;
}
vi.mock("./shims/supabase", () => ({
  supabase: { from: query, rpc: vi.fn(), auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) }, storage: { from: () => ({}) } },
}));

const { FinanceInvoicesWorkspace } = await import("@/components/finance-invoices-workspace");
afterEach(cleanup);

describe("council invoices screen", () => {
  it("lists invoices with workflow and payment status, totals a selection, and shows placements and councils", async () => {
    render(<FinanceInvoicesWorkspace />);
    await waitFor(() => expect(screen.getByText("PCTST1126")).toBeTruthy());
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getAllByText("TST · Hematite House").length).toBe(2);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select PCTST1126" }));
    expect(screen.getByText("1 selected · £391.60")).toBeTruthy();
    expect((screen.getByRole("button", { name: /^Send$/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Placements" }));
    expect(screen.getByText("USN 000000")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Councils" }));
    expect(screen.getByText("Missing: needed to email invoices")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Invoice details" }));
    expect(screen.getByText(/Only the director can change them/)).toBeTruthy();
  });
});

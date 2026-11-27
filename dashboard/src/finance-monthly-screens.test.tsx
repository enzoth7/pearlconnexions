// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const month = `${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()).slice(0, 7)}-01`;
const tables: Record<string, unknown[]> = {
  qa_homes: [{ id: "h1", name: "Garnet House", active: true }, { id: "h2", name: "Brambles Acre", active: false }],
  finance_cost_lines: [
    { id: "c1", period_month: month, home_id: "h1", section: "Fixed", description: "Rent", amount_gbp: 4750, recurring: true, notes: "", version: 1 },
    { id: "c2", period_month: month, home_id: null, section: "Variable", description: "Recruitment advertising", amount_gbp: 180, recurring: false, notes: "", version: 1 },
  ],
  finance_payroll_entries: [
    { id: "p1", period_month: month, staff_name: "Jordan Blake", position: "House Lead", invoice_received: true, timesheet_required: true, timesheet_received: false, total_gbp: 3300, split: { h1: 3300 }, paid_on: null, comments: "", version: 1 },
    { id: "p2", period_month: month, staff_name: "Hannah Moore", position: "Office Administrator", invoice_received: false, timesheet_required: false, timesheet_received: false, total_gbp: 1850, split: { office: 1000 }, paid_on: null, comments: "", version: 1 },
  ],
  finance_invoices: [{ home_id: "h1", period_month: month, amount_gbp: 38700, received_gbp: 0, due_on: "2099-01-01", status: "Sent" }],
  finance_settings: [{ id: "s1", version: 1, monthly_expense_budget_gbp: 35000 }],
  profiles: [{ role: "manager" }],
};
function query(table: string) {
  const rows = tables[table] ?? [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "in"]) chain[method] = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: rows[0] ?? null, error: null });
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: rows, error: null });
  return chain;
}
vi.mock("./shims/supabase", () => ({ supabase: { from: query, rpc: vi.fn(), auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) } } }));

const { FinanceMonthlyOverview } = await import("@/components/finance-monthly-overview");
const { FinanceCostLines } = await import("@/components/finance-cost-lines");
const { FinancePayrollChecklist } = await import("@/components/finance-payroll-checklist");
afterEach(cleanup);

describe("monthly finance screens", () => {
  it("overview shows the month by house and what needs attention", async () => {
    render(<FinanceMonthlyOverview />);
    await waitFor(() => expect(screen.getByText("£38,700.00", { selector: "strong" })).toBeTruthy());
    expect(screen.getByText("Office & management")).toBeTruthy();
    expect(screen.getByText("Timesheets missing")).toBeTruthy();
    expect(screen.getByText("Pay not shared between houses")).toBeTruthy();
    expect(screen.getByText("Only the director can change the budget.")).toBeTruthy();
  });

  it("monthly costs total each house against the budget", async () => {
    render(<FinanceCostLines />);
    await waitFor(() => expect(screen.getByText("Rent")).toBeTruthy());
    expect(screen.getAllByText("£4,930.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/left of £35,000.00/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Rent (Garnet House)" })).toBeTruthy();
  });

  it("payroll checklist shows missing invoices and timesheets per person", async () => {
    render(<FinancePayrollChecklist />);
    await waitFor(() => expect(screen.getByText("Jordan Blake")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Jordan Blake: timesheet missing, mark as received" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hannah Moore: invoice missing, mark as received" })).toBeTruthy();
    expect(screen.getByText(/£850.00 not shared between houses/)).toBeTruthy();
  });
});

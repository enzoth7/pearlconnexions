import { describe, expect, it } from "vitest";
import { monthChoices, payStatus, payrollDueDate, summariseMonth, unallocated, type CostLine, type PayrollEntry } from "@/lib/finance-monthly";

const homes = [
  { id: "garnet", name: "Garnet House", active: true },
  { id: "ruby", name: "Ruby House", active: true },
  { id: "brambles", name: "Brambles Acre", active: false },
];
let id = 0;
const cost = (home_id: string | null, description: string, amount_gbp: number, extra: Partial<CostLine> = {}): CostLine =>
  ({ id: String(++id), period_month: "2026-11-01", home_id, section: "Fixed", description, amount_gbp, recurring: true, notes: "", version: 1, ...extra });
const pay = (staff_name: string, total_gbp: number, split: Record<string, number>, extra: Partial<PayrollEntry> = {}): PayrollEntry =>
  ({ id: staff_name, period_month: "2026-11-01", staff_name, position: "Support Worker", invoice_received: true, timesheet_required: true, timesheet_received: true, total_gbp, split, paid_on: "2026-12-15", comments: "", version: 1, ...extra });

describe("monthly finance summary", () => {
  const base = {
    month: "2026-11-01", homes, budget: 6000, today: "2026-11-27",
    costs: [
      cost("garnet", "Rent", 4750), cost("ruby", "Rent", 5500), cost("ruby", "Boiler replacement", 3200, { section: "Variable", recurring: false }),
      cost(null, "Office rent", 1100), cost("brambles", "Rent", 3500),
    ],
    previousCosts: [cost("garnet", "Broadband", 52, { period_month: "2026-10-01" }), cost("garnet", "Rent", 4750, { period_month: "2026-10-01" })],
    payroll: [
      pay("Jordan Blake", 3300, { garnet: 3300 }),
      pay("Mia Clarke", 2600, { garnet: 1560, ruby: 1040 }, { invoice_received: false }),
      pay("Tom Fisher", 2480, { ruby: 2000 }, { timesheet_received: false }),
      pay("Daniel Ward", 4200, { office: 4200 }, { timesheet_required: false, timesheet_received: false }),
    ],
    invoices: [
      { home_id: "garnet", period_month: "2026-11-01", amount_gbp: 38700, received_gbp: 38700, due_on: "2026-11-30", status: "Sent" },
      { home_id: "ruby", period_month: "2026-11-01", amount_gbp: 42300, received_gbp: 20000, due_on: "2026-11-30", status: "Sent" },
      { home_id: "ruby", period_month: "2026-11-01", amount_gbp: 999, received_gbp: 0, due_on: "2026-11-30", status: "Draft" },
    ],
  };

  it("works out each house's margin from invoices, running costs and shared staff pay", () => {
    const { houses, totals } = summariseMonth(base);
    const garnet = houses.find(row => row.key === "garnet")!;
    expect(garnet).toMatchObject({ income: 38700, runningTotal: 4750, staff: 4860, margin: 29090 });
    const ruby = houses.find(row => row.key === "ruby")!;
    expect(ruby).toMatchObject({ income: 42300, outstanding: 22300, runningTotal: 8700, staff: 3040 });
    expect(houses.at(-1)).toMatchObject({ key: "office", runningTotal: 1100, staff: 4200 });
    expect(totals).toMatchObject({ income: 81000, running: 18050, staff: 12580, margin: 50370 });
  });

  it("raises the alerts Ruben and Joel asked for", () => {
    const labels = summariseMonth(base).alerts.map(alert => alert.label);
    expect(labels).toEqual([
      "Running costs over budget", "Staff invoices missing", "Timesheets missing", "Pay not shared between houses",
      "Fixed costs missing this month", "Costs on an inactive house", "Council income still to collect",
    ]);
    expect(summariseMonth(base).alerts.find(alert => alert.label === "Fixed costs missing this month")?.detail).toBe("Broadband (Garnet House)");
  });

  it("flags pay as incomplete only after the pay date", () => {
    const unpaid = pay("Ryan Cole", 2000, { ruby: 2000 }, { period_month: "2026-10-01", paid_on: null });
    expect(payrollDueDate("2026-10-01")).toBe("2026-11-15");
    expect(payStatus(unpaid, "2026-11-10")).toBe("Not due");
    expect(payStatus(unpaid, "2026-11-27")).toBe("Unpaid");
    const alerts = summariseMonth({ ...base, month: "2026-10-01", payroll: [unpaid] }).alerts;
    expect(alerts.find(alert => alert.label === "Incomplete payments")).toMatchObject({ tone: "red", detail: "1 person not paid after the pay date: Ryan Cole" });
    expect(unallocated(pay("A", 100, { ruby: 60 }))).toBe(40);
  });

  it("offers months with records plus the current and next month", () => {
    expect(monthChoices(["2026-09-01", "2026-11-01"], "2026-11-27")).toEqual(["2026-12-01", "2026-11-01", "2026-09-01"]);
  });
});

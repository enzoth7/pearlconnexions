// Monthly finance picture: running costs per house, staff pay per house, council
// income per house and the alerts Ruben and Joel asked for. Pure functions, no I/O.

export type CostSection = "Fixed" | "Allowances" | "Variable";
export const costSections: CostSection[] = ["Fixed", "Allowances", "Variable"];
export const OFFICE = "office";

export type CostLine = {
  id: string; period_month: string; home_id: string | null; section: CostSection; description: string;
  amount_gbp: number; recurring: boolean; notes: string; version: number;
};
export type PayrollEntry = {
  id: string; period_month: string; staff_name: string; position: string; invoice_received: boolean;
  timesheet_required: boolean; timesheet_received: boolean; total_gbp: number; split: Record<string, number>;
  paid_on: string | null; comments: string; version: number;
};
export type MonthInvoice = { home_id: string | null; period_month: string | null; amount_gbp: number; received_gbp: number; due_on: string; status: string };
export type MonthHome = { id: string; name: string; active: boolean };

export type HouseRow = {
  key: string; name: string; active: boolean; income: number; outstanding: number;
  running: Record<CostSection, number>; runningTotal: number; staff: number; margin: number;
};
export type Alert = { tone: "red" | "amber" | "sky"; label: string; detail: string; href: string };

const round = (value: number) => Math.round(value * 100) / 100;

export function monthStart(isoDate: string) {
  return `${isoDate.slice(0, 7)}-01`;
}
export function shiftMonth(isoMonth: string, offset: number) {
  const [year, month] = isoMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}
/** Pay for a month goes out on the 15th of the next month. */
export function payrollDueDate(isoMonth: string) {
  return `${shiftMonth(isoMonth, 1).slice(0, 7)}-15`;
}
export function splitTotal(split: Record<string, number>) {
  return round(Object.values(split ?? {}).reduce((sum, value) => sum + Number(value || 0), 0));
}
export function unallocated(entry: Pick<PayrollEntry, "total_gbp" | "split">) {
  return round(Number(entry.total_gbp) - splitTotal(entry.split));
}

export type PayStatus = "Paid" | "Not due" | "Unpaid";
export function payStatus(entry: Pick<PayrollEntry, "paid_on" | "period_month">, today: string): PayStatus {
  if (entry.paid_on) return "Paid";
  return payrollDueDate(entry.period_month) < today ? "Unpaid" : "Not due";
}

/** Month options: every month that has records, plus the current and next month. */
export function monthChoices(months: string[], today: string) {
  const current = monthStart(today);
  return [...new Set([...months.map(monthStart), current, shiftMonth(current, 1)])].sort().reverse();
}

export function summariseMonth({ month, homes, costs, previousCosts, payroll, invoices, budget, today }: {
  month: string; homes: MonthHome[]; costs: CostLine[]; previousCosts: CostLine[]; payroll: PayrollEntry[];
  invoices: MonthInvoice[]; budget: number; today: string;
}) {
  const rows = new Map<string, HouseRow>();
  const row = (key: string) => {
    let current = rows.get(key);
    if (!current) {
      const home = homes.find(item => item.id === key);
      current = { key, name: key === OFFICE ? "Office & management" : home?.name ?? "Unknown house", active: key === OFFICE || Boolean(home?.active), income: 0, outstanding: 0, running: { Fixed: 0, Allowances: 0, Variable: 0 }, runningTotal: 0, staff: 0, margin: 0 };
      rows.set(key, current);
    }
    return current;
  };
  for (const home of homes.filter(item => item.active)) row(home.id);
  row(OFFICE);

  for (const line of costs) {
    const target = row(line.home_id ?? OFFICE);
    target.running[line.section] = round(target.running[line.section] + Number(line.amount_gbp));
  }
  for (const entry of payroll) {
    for (const [key, amount] of Object.entries(entry.split ?? {})) {
      const target = row(key === OFFICE ? OFFICE : key);
      target.staff = round(target.staff + Number(amount || 0));
    }
  }
  for (const invoice of invoices.filter(item => item.status !== "Draft" && monthStart(item.period_month ?? "") === month)) {
    const target = row(invoice.home_id ?? OFFICE);
    target.income = round(target.income + Number(invoice.amount_gbp));
    target.outstanding = round(target.outstanding + Math.max(0, Number(invoice.amount_gbp) - Number(invoice.received_gbp)));
  }
  for (const item of rows.values()) {
    item.runningTotal = round(costSections.reduce((sum, section) => sum + item.running[section], 0));
    item.margin = round(item.income - item.runningTotal - item.staff);
  }
  const houses = [...rows.values()].sort((a, b) => Number(a.key === OFFICE) - Number(b.key === OFFICE) || a.name.localeCompare(b.name));

  const totals = {
    income: round(houses.reduce((sum, item) => sum + item.income, 0)),
    outstanding: round(houses.reduce((sum, item) => sum + item.outstanding, 0)),
    running: round(houses.reduce((sum, item) => sum + item.runningTotal, 0)),
    staff: round(payroll.reduce((sum, entry) => sum + Number(entry.total_gbp), 0)),
    margin: 0,
    budget,
  };
  totals.margin = round(totals.income - totals.running - totals.staff);

  const alerts: Alert[] = [];
  if (budget > 0 && totals.running > budget) alerts.push({ tone: "red", label: "Running costs over budget", detail: `£${(totals.running - budget).toLocaleString("en-GB", { maximumFractionDigits: 2 })} over the £${budget.toLocaleString("en-GB")} monthly budget`, href: "/finance/expenses" });
  const unpaid = payroll.filter(entry => payStatus(entry, today) === "Unpaid");
  if (unpaid.length) alerts.push({ tone: "red", label: "Incomplete payments", detail: `${unpaid.length} ${unpaid.length === 1 ? "person" : "people"} not paid after the pay date: ${unpaid.map(entry => entry.staff_name).join(", ")}`, href: "/finance/payroll" });
  const missingInvoices = payroll.filter(entry => !entry.invoice_received);
  if (missingInvoices.length) alerts.push({ tone: "amber", label: "Staff invoices missing", detail: missingInvoices.map(entry => entry.staff_name).join(", "), href: "/finance/payroll" });
  const missingTimesheets = payroll.filter(entry => entry.timesheet_required && !entry.timesheet_received);
  if (missingTimesheets.length) alerts.push({ tone: "amber", label: "Timesheets missing", detail: missingTimesheets.map(entry => entry.staff_name).join(", "), href: "/finance/payroll" });
  const misallocated = payroll.filter(entry => Math.abs(unallocated(entry)) >= 0.01 && Number(entry.total_gbp) > 0);
  if (misallocated.length) alerts.push({ tone: "amber", label: "Pay not shared between houses", detail: misallocated.map(entry => entry.staff_name).join(", "), href: "/finance/payroll" });
  const missingFixed = previousCosts.filter(previous => previous.recurring && !costs.some(line => line.home_id === previous.home_id && line.description.trim().toLowerCase() === previous.description.trim().toLowerCase()));
  if (missingFixed.length) alerts.push({ tone: "amber", label: "Fixed costs missing this month", detail: missingFixed.map(line => `${line.description} (${row(line.home_id ?? OFFICE).name})`).join(", "), href: "/finance/expenses" });
  const inactiveCosts = costs.filter(line => line.home_id && homes.find(home => home.id === line.home_id)?.active === false);
  if (inactiveCosts.length) alerts.push({ tone: "sky", label: "Costs on an inactive house", detail: [...new Set(inactiveCosts.map(line => `${row(line.home_id!).name}: ${line.description}`))].join(", "), href: "/finance/expenses" });
  if (totals.outstanding > 0) alerts.push({ tone: "sky", label: "Council income still to collect", detail: `£${totals.outstanding.toLocaleString("en-GB", { maximumFractionDigits: 2 })} of this month's invoices`, href: "/finance/invoices" });

  return { houses, totals, alerts };
}

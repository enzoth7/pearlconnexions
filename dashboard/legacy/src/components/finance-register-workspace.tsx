"use client";

import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HrFilterHeader, hrDate, hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { supabase } from "../../../src/shims/supabase";

export type FinanceRegister = "expenses" | "payroll" | "invoices";
type Row = Record<string, unknown> & { id: string; version: number };
type Home = { id: string; name: string };
type Field = { key: string; label: string; kind: "text" | "date" | "month" | "money" | "integer" | "select" | "textarea"; required?: boolean; options?: string[]; hint?: string };
type Column = { key: string; label: string; kind?: "date" | "month" | "money" | "status"; choices?: string[]; hidden?: string };

const expenseKinds = ["Business expense", "Reimbursement"];
const expenseCategories = ["Agency", "Maintenance", "Property & utilities", "Subsistence", "Training", "Operations", "Other"];
const expenseStatuses = ["Pending", "Approved", "Paid"];
const reconciledStates = ["Pending", "Yes", "No"];
const configs: Record<FinanceRegister, { title: string; description: string; item: string; table: string; order: string; fields: Field[]; columns: Column[] }> = {
  expenses: {
    title: "Expenses", description: "Business costs and reimbursements.", item: "expense", table: "finance_expenses", order: "expense_on",
    fields: [
      { key: "expense_on", label: "Date", kind: "date", required: true }, { key: "kind", label: "Type", kind: "select", required: true, options: expenseKinds },
      { key: "category", label: "Category", kind: "select", required: true, options: expenseCategories }, { key: "home_id", label: "Home", kind: "select" },
      { key: "description", label: "Description", kind: "text", required: true }, { key: "payee", label: "Payee / claimant", kind: "text", required: true },
      { key: "amount_gbp", label: "Amount (£)", kind: "money", required: true }, { key: "status", label: "Payment status", kind: "select", required: true, options: expenseStatuses },
      { key: "due_on", label: "Due date", kind: "date" }, { key: "paid_on", label: "Paid on", kind: "date", hint: "Required when status is Paid." },
      { key: "notes", label: "Notes", kind: "textarea" },
    ],
    columns: [
      { key: "expense_on", label: "Date", kind: "date" }, { key: "kind", label: "Type", choices: expenseKinds },
      { key: "category", label: "Category", choices: expenseCategories }, { key: "home_id", label: "Home", hidden: "hidden lg:table-cell" },
      { key: "payee", label: "Payee", hidden: "hidden xl:table-cell" }, { key: "amount_gbp", label: "Amount", kind: "money" },
      { key: "status", label: "Status", kind: "status", choices: expenseStatuses },
    ],
  },
  payroll: {
    title: "Payroll", description: "Monthly payroll reconciliation and payment checks.", item: "payroll period", table: "finance_payroll_periods", order: "period_month",
    fields: [
      { key: "period_month", label: "Month", kind: "month", required: true }, { key: "planned_amount_gbp", label: "Planned payroll (£)", kind: "money" },
      { key: "actual_amount_gbp", label: "Actual payroll (£)", kind: "money" }, { key: "payslips_processed", label: "Payslips processed", kind: "integer" },
      { key: "payslips_correct", label: "Payslips correct", kind: "integer" }, { key: "incomplete_payments", label: "Incomplete payments", kind: "integer" },
      { key: "rota_reconciled", label: "Rota reconciled", kind: "select", options: reconciledStates },
      { key: "report_sent_on", label: "Report sent on", kind: "date" }, { key: "notes", label: "Notes", kind: "textarea" },
    ],
    columns: [
      { key: "period_month", label: "Month", kind: "month" }, { key: "planned_amount_gbp", label: "Planned", kind: "money", hidden: "hidden lg:table-cell" },
      { key: "actual_amount_gbp", label: "Actual", kind: "money" }, { key: "variance", label: "Variance", kind: "money", hidden: "hidden lg:table-cell" },
      { key: "payslips_processed", label: "Payslips", hidden: "hidden xl:table-cell" }, { key: "incomplete_payments", label: "Incomplete" },
      { key: "rota_reconciled", label: "Rota", kind: "status", choices: reconciledStates },
    ],
  },
  invoices: {
    title: "Invoices", description: "Issued invoices, receipts and outstanding balances.", item: "invoice", table: "finance_invoices", order: "issued_on",
    fields: [
      { key: "invoice_number", label: "Invoice reference", kind: "text", required: true }, { key: "customer_name", label: "Local authority / customer", kind: "text", required: true },
      { key: "home_id", label: "Home", kind: "select" }, { key: "period_month", label: "Service month", kind: "month" },
      { key: "issued_on", label: "Issued on", kind: "date", required: true }, { key: "due_on", label: "Due on", kind: "date", required: true },
      { key: "amount_gbp", label: "Invoice amount (£)", kind: "money", required: true }, { key: "received_gbp", label: "Received (£)", kind: "money" },
      { key: "last_received_on", label: "Last payment on", kind: "date", hint: "Required when any payment is received." },
      { key: "notes", label: "Notes", kind: "textarea" },
    ],
    columns: [
      { key: "invoice_number", label: "Reference" }, { key: "customer_name", label: "Customer" },
      { key: "home_id", label: "Home", hidden: "hidden lg:table-cell" }, { key: "issued_on", label: "Issued", kind: "date", hidden: "hidden xl:table-cell" },
      { key: "due_on", label: "Due", kind: "date" }, { key: "outstanding", label: "Outstanding", kind: "money" },
      { key: "invoice_status", label: "Status", kind: "status", choices: ["Paid", "Part paid", "Overdue", "Unpaid"] },
    ],
  },
};

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const monthLabel = (value: string) => value ? new Date(`${value.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short", year: "numeric" }) : "—";
const asNumber = (value: unknown) => value === null || value === undefined || value === "" ? null : Number(value);
const invoiceStatus = (row: Row) => {
  const amount = Number(row.amount_gbp ?? 0), received = Number(row.received_gbp ?? 0);
  if (received >= amount) return "Paid";
  if (String(row.due_on ?? "") < londonToday()) return "Overdue";
  return received > 0 ? "Part paid" : "Unpaid";
};
function statusTone(status: string) {
  return status === "Paid" || status === "Yes" ? "bg-emerald-100 text-emerald-900" : status === "Overdue" || status === "No" ? "bg-rose-100 text-rose-900" : status === "Approved" || status === "Part paid" ? "bg-sky-100 text-sky-900" : "bg-amber-100 text-amber-900";
}
function blank(mode: FinanceRegister): Record<string, string> {
  const form = Object.fromEntries(configs[mode].fields.map(field => [field.key, ""]));
  if (mode === "expenses") Object.assign(form, { expense_on: londonToday(), kind: "Business expense", category: "Operations", status: "Pending" });
  if (mode === "payroll") Object.assign(form, { period_month: londonToday().slice(0, 7), rota_reconciled: "Pending" });
  if (mode === "invoices") Object.assign(form, { issued_on: londonToday(), received_gbp: "0" });
  return form;
}
function formFromRow(mode: FinanceRegister, row: Row): Record<string, string> {
  return Object.fromEntries(configs[mode].fields.map(field => [field.key, field.kind === "month" ? String(row[field.key] ?? "").slice(0, 7) : String(row[field.key] ?? "")]));
}
function fieldValue(row: Row, key: string, homes: Home[]): unknown {
  if (key === "home_id") return homes.find(home => home.id === row.home_id)?.name ?? "—";
  if (key === "variance") return asNumber(row.planned_amount_gbp) === null || asNumber(row.actual_amount_gbp) === null ? null : Number(row.actual_amount_gbp) - Number(row.planned_amount_gbp);
  if (key === "outstanding") return Number(row.amount_gbp ?? 0) - Number(row.received_gbp ?? 0);
  if (key === "invoice_status") return invoiceStatus(row);
  return row[key];
}
function showValue(value: unknown, kind?: Column["kind"] | Field["kind"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "money") return money.format(Number(value));
  if (kind === "date") return hrDate(String(value));
  if (kind === "month") return monthLabel(String(value));
  return String(value);
}
function parseAmount(value: string) { return value === "" ? null : Number(value); }
function parseCount(value: string) { return value === "" ? null : Number(value); }

export function FinanceRegisterWorkspace({ mode }: { mode: FinanceRegister }) {
  const config = configs[mode];
  const [rows, setRows] = useState<Row[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => blank(mode));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [records, houses] = await Promise.all([
      supabase.from(config.table).select("*").order(config.order, { ascending: false }),
      supabase.from("qa_homes").select("id,name").eq("active", true).order("name"),
    ]);
    setRows((records.data ?? []) as Row[]);
    setHomes((houses.data ?? []) as Home[]);
    setError(records.error?.message ?? houses.error?.message ?? "");
    setLoading(false);
  }, [config.order, config.table]);
  useEffect(() => { void load(); }, [load]);
  const visible = rows.filter(row => config.columns.every(column => {
    const filter = filters[column.key];
    if (!filter) return true;
    const value = fieldValue(row, column.key, homes);
    if (column.kind === "month") return String(value ?? "").slice(0, 7) === filter;
    if (column.kind === "date" || column.choices) return String(value ?? "") === filter;
    return String(value ?? "").toLowerCase().includes(filter.toLowerCase());
  }));
  function open(row?: Row) { setForm(row ? formFromRow(mode, row) : blank(mode)); setEditing(row ?? "new"); setErrors({}); setError(""); }
  async function save() {
    const next: Record<string, string> = {};
    for (const field of config.fields) {
      const value = form[field.key]?.trim() ?? "";
      if (field.required && !value) next[field.key] = "Required.";
      if (value && field.kind === "money" && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 9999999999.99 || Number(value) < (field.key === "amount_gbp" ? 0.01 : 0))) next[field.key] = "Enter a valid amount in pounds.";
      if (value && field.kind === "integer" && (!/^\d+$/.test(value) || Number(value) > 1000000)) next[field.key] = "Enter a whole number.";
      if (value && field.kind === "select" && field.key !== "home_id" && !field.options?.includes(value)) next[field.key] = "Select a listed value.";
    }
    if (mode === "expenses") {
      if ((form.description?.trim().length ?? 0) < 2) next.description = "Enter a description.";
      if ((form.payee?.trim().length ?? 0) < 2) next.payee = "Enter a payee or claimant.";
      if (form.due_on && form.due_on < form.expense_on) next.due_on = "Due date cannot precede the expense.";
      if (form.status === "Paid" && !form.paid_on) next.paid_on = "Enter the payment date.";
      if (form.status !== "Paid" && form.paid_on) next.paid_on = "Change status to Paid first.";
      if (form.paid_on && form.paid_on < form.expense_on) next.paid_on = "Payment cannot precede the expense.";
    }
    if (mode === "payroll") {
      if (form.payslips_correct && !form.payslips_processed) next.payslips_processed = "Enter the number processed.";
      if (form.incomplete_payments && !form.payslips_processed) next.payslips_processed = "Enter the number processed.";
      if (form.payslips_processed && form.payslips_correct && Number(form.payslips_correct) > Number(form.payslips_processed)) next.payslips_correct = "Cannot exceed processed payslips.";
      if (form.payslips_processed && form.incomplete_payments && Number(form.incomplete_payments) > Number(form.payslips_processed)) next.incomplete_payments = "Cannot exceed processed payslips.";
    }
    if (mode === "invoices") {
      if ((form.invoice_number?.trim().length ?? 0) < 2) next.invoice_number = "Enter an invoice reference.";
      if ((form.customer_name?.trim().length ?? 0) < 2) next.customer_name = "Enter a customer.";
      if (form.due_on && form.issued_on && form.due_on < form.issued_on) next.due_on = "Due date cannot precede issue date.";
      if (Number(form.received_gbp || 0) > Number(form.amount_gbp || 0)) next.received_gbp = "Received cannot exceed the invoice amount.";
      if (Number(form.received_gbp || 0) > 0 && !form.last_received_on) next.last_received_on = "Enter the last payment date.";
      if (Number(form.received_gbp || 0) === 0 && form.last_received_on) next.last_received_on = "Enter a received amount first.";
      if (form.last_received_on && form.last_received_on < form.issued_on) next.last_received_on = "Payment cannot precede issue date.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    let values: Record<string, unknown>;
    if (mode === "expenses") values = { expense_on: form.expense_on, kind: form.kind, category: form.category, home_id: form.home_id || null, description: form.description.trim(), payee: form.payee.trim(), amount_gbp: parseAmount(form.amount_gbp), status: form.status, due_on: form.due_on || null, paid_on: form.paid_on || null, notes: form.notes.trim() };
    else if (mode === "payroll") values = { period_month: `${form.period_month}-01`, planned_amount_gbp: parseAmount(form.planned_amount_gbp), actual_amount_gbp: parseAmount(form.actual_amount_gbp), payslips_processed: parseCount(form.payslips_processed), payslips_correct: parseCount(form.payslips_correct), incomplete_payments: parseCount(form.incomplete_payments), rota_reconciled: form.rota_reconciled, report_sent_on: form.report_sent_on || null, notes: form.notes.trim() };
    else values = { invoice_number: form.invoice_number.trim(), customer_name: form.customer_name.trim(), home_id: form.home_id || null, period_month: form.period_month ? `${form.period_month}-01` : null, issued_on: form.issued_on, due_on: form.due_on, amount_gbp: parseAmount(form.amount_gbp), received_gbp: Number(form.received_gbp || 0), last_received_on: form.last_received_on || null, notes: form.notes.trim() };
    setBusy(true);
    const result = editing !== "new" && editing
      ? await supabase.from(config.table).update({ ...values, version: editing.version + 1 }).eq("id", editing.id).eq("version", editing.version).select().maybeSingle()
      : await supabase.from(config.table).insert(values).select().maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This record changed. Reload and try again."); return; }
    setEditing(null); setError(""); await load();
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold text-[#102c39]">{config.title}</h1><div className="mt-2 text-sm text-slate-600">{config.description}</div></div><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white" onClick={() => open()}><Plus size={18} aria-hidden />Add {config.item}</button></header>
    {error && !editing && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6">Loading {config.title.toLowerCase()}…</div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm"><caption className="sr-only">{config.title} register</caption><thead><tr>{config.columns.map(column => <th scope="col" key={column.key} className={`min-w-0 px-2 py-2 sm:px-3 ${column.hidden ?? ""}`}><HrFilterHeader id={`finance-${mode}-${column.key}`} label={column.label} value={filters[column.key] ?? ""} options={column.choices ?? (column.key === "home_id" ? homes.map(home => home.name) : undefined)} type={column.kind === "date" || column.kind === "month" ? column.kind : "text"} onChange={value => setFilters(current => ({ ...current, [column.key]: value }))} /></th>)}<th scope="col" className="w-14 px-2 py-2"><div className="sr-only">Details</div></th></tr></thead><tbody className="divide-y divide-slate-200">{visible.map(row => <tr key={row.id}>{config.columns.map(column => { const value = fieldValue(row, column.key, homes); return <td key={column.key} className={`min-w-0 break-words px-2 py-2.5 sm:px-3 ${column.hidden ?? ""}`}>{column.kind === "status" ? <strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusTone(String(value))}`}>{String(value)}</strong> : showValue(value, column.kind)}</td>; })}<td className="px-2 py-2"><button type="button" aria-label={`Show ${config.item} details`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setDetails(row)}><Plus size={18} aria-hidden /></button></td></tr>)}</tbody></table>{!visible.length && <div className="p-8 text-center text-sm text-slate-600">{rows.length ? "No records match these filters." : `No ${config.title.toLowerCase()} recorded yet.`}</div>}</div>}
    <Dialog open={Boolean(details)} onOpenChange={value => { if (!value) setDetails(null); }}><DialogContent><DialogHeader><DialogTitle>{details ? String(details.invoice_number ?? details.description ?? monthLabel(String(details.period_month ?? ""))) : "Record details"}</DialogTitle></DialogHeader>{details && <><dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{config.fields.filter(field => field.key !== "notes").map(field => <div key={field.key} className="min-w-0 border-b border-slate-200 pb-2"><dt className="text-xs font-semibold text-slate-500">{field.label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#102c39]">{showValue(fieldValue(details, field.key, homes), field.kind)}</dd></div>)}</dl>{Boolean(details.notes) && <div><h3 className="text-sm font-semibold text-[#102c39]">Notes</h3><div className="mt-1 whitespace-pre-wrap text-sm">{String(details.notes)}</div></div>}<div className="flex justify-end border-t border-slate-200 pt-4"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-teal-800" onClick={() => { const row = details; setDetails(null); open(row); }}><Pencil size={17} aria-hidden />Edit</button></div></>}</DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={value => { if (!value && !busy) { setEditing(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? `Add ${config.item}` : `Edit ${config.item}`}</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{config.fields.filter(field => field.kind !== "textarea").map(field => field.kind === "select" ? <MaintenanceSelectField key={field.key} name={`finance-${mode}-${field.key}`} label={field.label} value={form[field.key] || "__none__"} options={field.key === "home_id" ? [{ value: "__none__", label: "Not assigned" }, ...homes.map(home => ({ value: home.id, label: home.name }))] : field.options ?? []} onChange={value => setForm(current => ({ ...current, [field.key]: value === "__none__" ? "" : value }))} error={errors[field.key]} /> : <label key={field.key} className="text-sm font-medium">{field.label}<input className={hrFieldClass} type={field.kind === "money" || field.kind === "integer" ? "number" : field.kind} min={field.kind === "money" || field.kind === "integer" ? "0" : undefined} step={field.kind === "money" ? "0.01" : field.kind === "integer" ? "1" : undefined} value={form[field.key] ?? ""} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} />{field.hint && <div className="mt-1 text-xs font-normal text-slate-600">{field.hint}</div>}{errors[field.key] && <div className="mt-1 text-sm text-rose-800">{errors[field.key]}</div>}</label>)}</div>{config.fields.some(field => field.key === "notes") && <label className="text-sm font-medium">Notes<textarea className={hrFieldClass} rows={3} maxLength={4000} value={form.notes ?? ""} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>}{error && <div role="alert" className="text-sm text-rose-800">{error}</div>}<div className="flex justify-end gap-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : `Save ${config.item}`}</button></div></DialogContent></Dialog>
  </div>;
}

"use client";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hrDate, hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { gbp, monthLabel } from "@/lib/finance-invoices";
import { OFFICE, monthChoices, monthStart, payStatus, payrollDueDate, shiftMonth, splitTotal, unallocated, type MonthHome, type PayrollEntry } from "@/lib/finance-monthly";
import { supabase } from "../../../src/shims/supabase";

const button = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-teal-800 disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-50";
const pill = (tone: string, text: string) => <strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{text}</strong>;
const green = "bg-emerald-100 text-emerald-900", amber = "bg-amber-100 text-amber-900", red = "bg-rose-100 text-rose-900", grey = "bg-slate-100 text-slate-700";

/** Staff pay checklist (the Staff Pay Summary sheet without bank details), one row per person. */
export function FinancePayrollChecklist() {
  const today = londonToday();
  const [month, setMonth] = useState(monthStart(today));
  const [months, setMonths] = useState<string[]>([]);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [homes, setHomes] = useState<MonthHome[]>([]);
  const [editing, setEditing] = useState<PayrollEntry | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rows, allMonths, houses] = await Promise.all([
      supabase.from("finance_payroll_entries").select("*").eq("period_month", month).order("staff_name"),
      supabase.from("finance_payroll_entries").select("period_month"),
      supabase.from("qa_homes").select("id,name,active").order("name"),
    ]);
    setEntries((rows.data ?? []) as PayrollEntry[]);
    setMonths([...new Set(((allMonths.data ?? []) as { period_month: string }[]).map(row => row.period_month))]);
    setHomes((houses.data ?? []) as MonthHome[]);
    setError(rows.error?.message ?? "");
    setLoading(false);
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  async function patch(entry: PayrollEntry, values: Partial<PayrollEntry>) {
    setBusy(true); setError("");
    const result = await supabase.from("finance_payroll_entries").update({ ...values, version: entry.version + 1 }).eq("id", entry.id).eq("version", entry.version).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) setError(result.error?.message ?? "This row changed. Reload and try again.");
    await load();
  }
  async function copyPrevious() {
    setBusy(true); setError(""); setMessage("");
    const previous = shiftMonth(month, -1);
    const result = await supabase.rpc("copy_finance_month", { from_month: previous, to_month: month });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    const copied = (result.data as { staff?: number } | null)?.staff ?? 0;
    setMessage(copied ? `${copied} ${copied === 1 ? "person" : "people"} copied from ${monthLabel(previous)}, with invoices, timesheets and amounts to fill in.` : `Nothing to copy: everyone from ${monthLabel(previous)} is already here.`);
    await load();
  }

  const total = entries.reduce((sum, entry) => sum + Number(entry.total_gbp), 0);
  const invoicesMissing = entries.filter(entry => !entry.invoice_received).length;
  const timesheetsMissing = entries.filter(entry => entry.timesheet_required && !entry.timesheet_received).length;
  const unpaid = entries.filter(entry => payStatus(entry, today) === "Unpaid").length;
  const stats = [
    { label: "Pay this month", value: gbp.format(total), tone: "" },
    { label: "Invoices missing", value: String(invoicesMissing), tone: invoicesMissing ? "text-amber-800" : "" },
    { label: "Timesheets missing", value: String(timesheetsMissing), tone: timesheetsMissing ? "text-amber-800" : "" },
    { label: `Unpaid after ${hrDate(payrollDueDate(month))}`, value: String(unpaid), tone: unpaid ? "text-rose-800" : "" },
  ];

  return <section aria-label="Staff pay checklist" className="space-y-5">
    <div className="flex flex-wrap items-end gap-3">
      <MaintenanceSelectField name="payroll-month" label="Month" value={month} options={monthChoices(months, today).map(value => ({ value, label: monthLabel(value) }))} onChange={setMonth} className="w-56" />
      <button type="button" className={primary} onClick={() => setEditing("new")}><Plus size={18} aria-hidden />Add person</button>
      <button type="button" className={button} disabled={busy} onClick={() => void copyPrevious()}><Copy size={17} aria-hidden />Copy staff list from {monthLabel(shiftMonth(month, -1))}</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-[#102c39]">{message}</div>}

    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
      <dt className="text-sm font-semibold text-slate-600">{item.label}</dt><dd className={`mt-2 text-2xl font-semibold tabular-nums text-[#102c39] ${item.tone}`}>{item.value}</dd>
    </div>)}</dl>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Staff pay for {monthLabel(month)}</caption>
      <thead className="bg-[#102c39] text-white"><tr>
        <th scope="col" className="px-3 py-3 font-semibold">Person</th>
        <th scope="col" className="px-3 py-3 font-semibold">Invoice</th>
        <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">Timesheet</th>
        <th scope="col" className="hidden px-3 py-3 text-right font-semibold md:table-cell">Pay</th>
        <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">Paid</th>
        <th scope="col" className="w-16 px-2 py-3"><div className="sr-only">Edit</div></th>
      </tr></thead>
      <tbody className="divide-y divide-slate-200">{entries.map(entry => {
        const status = payStatus(entry, today);
        const gap = unallocated(entry);
        return <tr key={entry.id}>
          <td className="break-words px-3 py-2.5"><strong className="text-[#102c39]">{entry.staff_name}</strong><small className="block text-xs text-slate-600">{entry.position}{Math.abs(gap) >= 0.01 && Number(entry.total_gbp) > 0 ? ` · ${gbp.format(gap)} not shared between houses` : ""}</small><small className="block text-xs text-slate-600 md:hidden">{gbp.format(Number(entry.total_gbp))}</small></td>
          <td className="px-3 py-2.5"><button type="button" disabled={busy} aria-label={`${entry.staff_name}: invoice ${entry.invoice_received ? "received, mark as missing" : "missing, mark as received"}`} onClick={() => void patch(entry, { invoice_received: !entry.invoice_received })}>{entry.invoice_received ? pill(green, "Received") : pill(amber, "Missing")}</button></td>
          <td className="hidden px-3 py-2.5 sm:table-cell">{entry.timesheet_required ? <button type="button" disabled={busy} aria-label={`${entry.staff_name}: timesheet ${entry.timesheet_received ? "received, mark as missing" : "missing, mark as received"}`} onClick={() => void patch(entry, { timesheet_received: !entry.timesheet_received })}>{entry.timesheet_received ? pill(green, "Received") : pill(amber, "Missing")}</button> : pill(grey, "Not needed")}</td>
          <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{gbp.format(Number(entry.total_gbp))}</td>
          <td className="hidden px-3 py-2.5 lg:table-cell">{status === "Paid" ? pill(green, `Paid ${hrDate(entry.paid_on)}`) : status === "Unpaid" ? pill(red, "Unpaid") : pill(grey, `Due ${hrDate(payrollDueDate(entry.period_month))}`)}</td>
          <td className="px-2 py-2"><button type="button" aria-label={`Edit ${entry.staff_name}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setEditing(entry)}><Pencil size={16} aria-hidden /></button></td>
        </tr>;
      })}</tbody>
    </table>{!loading && !entries.length && <div className="p-8 text-center text-sm text-slate-600">No staff pay for {monthLabel(month)} yet. Add people, or copy the list from the previous month.</div>}</div>

    {editing && <PayrollEntryDialog entry={editing === "new" ? null : editing} month={month} homes={homes} onClose={() => setEditing(null)} onSaved={async text => { setEditing(null); setMessage(text); await load(); }} />}
  </section>;
}

function PayrollEntryDialog({ entry, month, homes, onClose, onSaved }: { entry: PayrollEntry | null; month: string; homes: MonthHome[]; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const shareKeys = [...homes.filter(home => home.active || entry?.split?.[home.id]).map(home => home.id), OFFICE];
  const [form, setForm] = useState({
    staff_name: entry?.staff_name ?? "", position: entry?.position ?? "", invoice_received: entry?.invoice_received ?? false,
    timesheet_required: entry?.timesheet_required ?? true, timesheet_received: entry?.timesheet_received ?? false,
    total: entry ? String(Number(entry.total_gbp)) : "", paid_on: entry?.paid_on ?? "", comments: entry?.comments ?? "",
  });
  const [shares, setShares] = useState<Record<string, string>>(() => Object.fromEntries(shareKeys.map(key => [key, entry?.split?.[key] ? String(entry.split[key]) : ""])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const split = Object.fromEntries(Object.entries(shares).filter(([, value]) => Number(value) > 0).map(([key, value]) => [key, Math.round(Number(value) * 100) / 100]));
  const remaining = Math.round((Number(form.total || 0) - splitTotal(split)) * 100) / 100;
  const label = (key: string) => key === OFFICE ? "Office" : homes.find(home => home.id === key)?.name ?? "House";

  async function save() {
    if (form.staff_name.trim().length < 2) { setError("Enter the person's name."); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(form.total.trim() || "0")) { setError("Enter the pay in pounds."); return; }
    if (Object.values(shares).some(value => value.trim() && !/^\d+(\.\d{1,2})?$/.test(value.trim()))) { setError("Each house share must be an amount in pounds."); return; }
    const values = {
      period_month: entry?.period_month ?? month, staff_name: form.staff_name.trim(), position: form.position.trim(),
      invoice_received: form.invoice_received, timesheet_required: form.timesheet_required, timesheet_received: form.timesheet_required && form.timesheet_received,
      total_gbp: Number(form.total || 0), split, paid_on: form.paid_on || null, comments: form.comments.trim(),
    };
    setBusy(true);
    const result = entry
      ? await supabase.from("finance_payroll_entries").update({ ...values, version: entry.version + 1 }).eq("id", entry.id).eq("version", entry.version).select("id").maybeSingle()
      : await supabase.from("finance_payroll_entries").insert(values).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.code === "23505" ? "This person is already on this month's list." : result.error?.message ?? "This row changed. Close and open it again."); return; }
    await onSaved(entry ? "Saved." : "Person added.");
  }
  async function remove() {
    if (!entry || !window.confirm(`Remove ${entry.staff_name} from ${monthLabel(entry.period_month)}? This cannot be undone.`)) return;
    setBusy(true);
    const result = await supabase.from("finance_payroll_entries").delete().eq("id", entry.id).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This person could not be removed."); return; }
    await onSaved("Removed from this month.");
  }

  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{entry ? entry.staff_name : `Add person · ${monthLabel(month)}`}</DialogTitle></DialogHeader>
    <div className="space-y-5">
      <div className="text-sm text-slate-600">Bank details are never stored here; they stay with the payroll provider.</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium">Name<input className={hrFieldClass} value={form.staff_name} maxLength={120} onChange={event => setForm(current => ({ ...current, staff_name: event.target.value }))} /></label>
        <label className="text-sm font-medium">Position<input className={hrFieldClass} value={form.position} maxLength={120} onChange={event => setForm(current => ({ ...current, position: event.target.value }))} /></label>
        <label className="text-sm font-medium">Pay (£)<input type="number" min="0" step="0.01" className={hrFieldClass} value={form.total} onChange={event => setForm(current => ({ ...current, total: event.target.value }))} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="size-5 accent-teal-700" checked={form.invoice_received} onChange={event => setForm(current => ({ ...current, invoice_received: event.target.checked }))} />Invoice received</label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="size-5 accent-teal-700" checked={form.timesheet_required} onChange={event => setForm(current => ({ ...current, timesheet_required: event.target.checked }))} />Needs a timesheet</label>
        {form.timesheet_required && <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="size-5 accent-teal-700" checked={form.timesheet_received} onChange={event => setForm(current => ({ ...current, timesheet_received: event.target.checked }))} />Timesheet received</label>}
        <label className="text-sm font-medium">Paid on<input type="date" className={hrFieldClass} value={form.paid_on} onChange={event => setForm(current => ({ ...current, paid_on: event.target.value }))} /><small className="mt-1 block text-xs font-normal text-slate-600">Pay date: {hrDate(payrollDueDate(entry?.period_month ?? month))}</small></label>
      </div>
      <section aria-label="Shared between houses" className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-[#102c39]">Shared between houses</h3>
          {pill(Math.abs(remaining) < 0.01 ? green : amber, Math.abs(remaining) < 0.01 ? "Fully shared" : remaining > 0 ? `${gbp.format(remaining)} still to share` : `${gbp.format(-remaining)} more than the pay`)}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{shareKeys.map(key =>
          <label key={key} className="text-xs font-semibold text-slate-600">{label(key)} (£)<input type="number" min="0" step="0.01" className={hrFieldClass} value={shares[key] ?? ""} onChange={event => setShares(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
        {Number(form.total) > 0 && remaining > 0 && <button type="button" className={button} onClick={() => {
          const target = shareKeys.find(key => Number(shares[key]) > 0) ?? shareKeys[0];
          setShares(current => ({ ...current, [target]: String(Math.round((Number(current[target] || 0) + remaining) * 100) / 100) }));
        }}>Add the rest to {label(shareKeys.find(key => Number(shares[key]) > 0) ?? shareKeys[0])}</button>}
      </section>
      <label className="block text-sm font-medium">Comments<textarea className={hrFieldClass} rows={2} maxLength={1000} value={form.comments} onChange={event => setForm(current => ({ ...current, comments: event.target.value }))} /></label>
      {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
      <div className="flex flex-wrap justify-between gap-3">
        {entry ? <button type="button" className={`${button} text-rose-800`} disabled={busy} onClick={() => void remove()}><Trash2 size={17} aria-hidden />Remove</button> : <div />}
        <div className="flex gap-3"><button type="button" className={button} onClick={onClose}>Cancel</button><button type="button" className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button></div>
      </div>
    </div>
  </DialogContent></Dialog>;
}

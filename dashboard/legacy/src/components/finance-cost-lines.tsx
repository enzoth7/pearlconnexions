"use client";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HrFilterHeader, hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { gbp, monthLabel } from "@/lib/finance-invoices";
import { OFFICE, costSections, monthChoices, monthStart, shiftMonth, type CostLine, type CostSection, type MonthHome } from "@/lib/finance-monthly";
import { supabase } from "../../../src/shims/supabase";

const button = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-teal-800 disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-50";

/** Monthly running costs per house (the Business Expenses sheet), entered by hand. */
export function FinanceCostLines() {
  const today = londonToday();
  const [month, setMonth] = useState(monthStart(today));
  const [months, setMonths] = useState<string[]>([]);
  const [lines, setLines] = useState<CostLine[]>([]);
  const [homes, setHomes] = useState<MonthHome[]>([]);
  const [budget, setBudget] = useState(0);
  const [filters, setFilters] = useState({ house: "", section: "" });
  const [editing, setEditing] = useState<CostLine | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rows, allMonths, houses, settings] = await Promise.all([
      supabase.from("finance_cost_lines").select("*").eq("period_month", month).order("section").order("description"),
      supabase.from("finance_cost_lines").select("period_month"),
      supabase.from("qa_homes").select("id,name,active").order("name"),
      supabase.from("finance_settings").select("monthly_expense_budget_gbp").maybeSingle(),
    ]);
    setLines((rows.data ?? []) as CostLine[]);
    setMonths([...new Set(((allMonths.data ?? []) as { period_month: string }[]).map(row => row.period_month))]);
    setHomes((houses.data ?? []) as MonthHome[]);
    setBudget(Number((settings.data as { monthly_expense_budget_gbp?: number } | null)?.monthly_expense_budget_gbp ?? 0));
    setError(rows.error?.message ?? houses.error?.message ?? "");
    setLoading(false);
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  const houseName = useCallback((id: string | null) => id ? homes.find(home => home.id === id)?.name ?? "Unknown house" : "Office & management", [homes]);
  const visible = lines.filter(line => (!filters.house || (line.home_id ?? OFFICE) === filters.house) && (!filters.section || line.section === filters.section));
  const byHouse = useMemo(() => {
    const keys = [...new Set([...homes.filter(home => home.active).map(home => home.id), ...lines.map(line => line.home_id ?? OFFICE)])];
    return keys.map(key => {
      const own = lines.filter(line => (line.home_id ?? OFFICE) === key);
      const totals = Object.fromEntries(costSections.map(section => [section, own.filter(line => line.section === section).reduce((sum, line) => sum + Number(line.amount_gbp), 0)])) as Record<CostSection, number>;
      return { key, name: key === OFFICE ? "Office & management" : houseName(key), totals, total: own.reduce((sum, line) => sum + Number(line.amount_gbp), 0), inactive: key !== OFFICE && homes.find(home => home.id === key)?.active === false };
    }).sort((a, b) => Number(a.key === OFFICE) - Number(b.key === OFFICE) || a.name.localeCompare(b.name));
  }, [homes, lines, houseName]);
  const total = lines.reduce((sum, line) => sum + Number(line.amount_gbp), 0);
  const used = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;

  async function copyPrevious() {
    setBusy(true); setError(""); setMessage("");
    const previous = shiftMonth(month, -1);
    const result = await supabase.rpc("copy_finance_month", { from_month: previous, to_month: month });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    const copied = (result.data as { costs?: number } | null)?.costs ?? 0;
    setMessage(copied ? `${copied} fixed ${copied === 1 ? "cost" : "costs"} copied from ${monthLabel(previous)}. Check the amounts.` : `Nothing to copy: ${monthLabel(previous)} has no repeating costs that are missing here.`);
    await load();
  }

  const header = (key: keyof typeof filters, label: string, options: Array<string | { value: string; label: string }>) =>
    <HrFilterHeader id={`cost-${key}`} label={label} value={filters[key]} options={options} dark onChange={value => setFilters(current => ({ ...current, [key]: value }))} />;

  return <section aria-label="Monthly costs" className="space-y-5">
    <div className="flex flex-wrap items-end gap-3">
      <MaintenanceSelectField name="cost-month" label="Month" value={month} options={monthChoices(months, today).map(value => ({ value, label: monthLabel(value) }))} onChange={setMonth} className="w-56" />
      <button type="button" className={primary} onClick={() => setEditing("new")}><Plus size={18} aria-hidden />Add cost</button>
      <button type="button" className={button} disabled={busy} onClick={() => void copyPrevious()}><Copy size={17} aria-hidden />Copy fixed costs from {monthLabel(shiftMonth(month, -1))}</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-[#102c39]">{message}</div>}

    <section aria-label="Budget" className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-base font-semibold text-[#102c39]">Running costs in {monthLabel(month)}</h2><strong className="mt-1 block text-3xl font-semibold tabular-nums text-[#102c39]">{gbp.format(total)}</strong></div>
        {budget > 0 && <strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${total > budget ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900"}`}>{total > budget ? `${gbp.format(total - budget)} over budget` : `${gbp.format(budget - total)} left of ${gbp.format(budget)}`}</strong>}
      </div>
      {budget > 0 && <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${Math.round((total / budget) * 100)}% of the monthly budget`}><div className={`h-full rounded-full ${total > budget ? "bg-rose-600" : "bg-teal-600"}`} style={{ width: `${used}%` }} /></div>}
    </section>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Running costs by house</caption>
      <thead className="bg-[#102c39] text-white"><tr>
        <th scope="col" className="px-3 py-3 font-semibold">House</th>
        {costSections.map(section => <th key={section} scope="col" className="hidden px-3 py-3 text-right font-semibold md:table-cell">{section}</th>)}
        <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-200">{byHouse.map(item => <tr key={item.key}>
        <td className="px-3 py-3 font-semibold text-[#102c39]">{item.name}{item.inactive && <strong className="ml-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">Inactive</strong>}</td>
        {costSections.map(section => <td key={section} className="hidden px-3 py-3 text-right tabular-nums md:table-cell">{item.totals[section] ? gbp.format(item.totals[section]) : "—"}</td>)}
        <td className="px-3 py-3 text-right font-semibold tabular-nums">{gbp.format(item.total)}</td>
      </tr>)}</tbody>
      <tfoot className="border-t-2 border-slate-300 bg-slate-50"><tr>
        <th scope="row" className="px-3 py-3 font-semibold text-[#102c39]">All houses and office</th>
        {costSections.map(section => <td key={section} className="hidden px-3 py-3 text-right font-semibold tabular-nums md:table-cell">{gbp.format(lines.filter(line => line.section === section).reduce((sum, line) => sum + Number(line.amount_gbp), 0))}</td>)}
        <td className="px-3 py-3 text-right font-semibold tabular-nums">{gbp.format(total)}</td>
      </tr></tfoot>
    </table></div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Cost lines for the month</caption>
      <thead className="bg-[#102c39] text-white"><tr>
        <th scope="col" className="px-3 py-2 font-semibold">Cost</th>
        <th scope="col" className="hidden px-3 py-2 sm:table-cell">{header("house", "House", [...homes.map(home => ({ value: home.id, label: home.name })), { value: OFFICE, label: "Office & management" }])}</th>
        <th scope="col" className="hidden px-3 py-2 md:table-cell">{header("section", "Type", costSections)}</th>
        <th scope="col" className="px-3 py-2 text-right font-semibold">Amount</th>
        <th scope="col" className="w-16 px-2 py-2"><div className="sr-only">Edit</div></th>
      </tr></thead>
      <tbody className="divide-y divide-slate-200">{visible.map(line => <tr key={line.id}>
        <td className="break-words px-3 py-2.5 font-medium text-[#102c39]">{line.description}{line.recurring && <small className="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">Monthly</small>}<small className="mt-1 block text-xs font-normal text-slate-600 sm:hidden">{houseName(line.home_id)} · {line.section}</small></td>
        <td className="hidden break-words px-3 py-2.5 sm:table-cell">{houseName(line.home_id)}</td>
        <td className="hidden px-3 py-2.5 md:table-cell">{line.section}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{gbp.format(Number(line.amount_gbp))}</td>
        <td className="px-2 py-2"><button type="button" aria-label={`Edit ${line.description} (${houseName(line.home_id)})`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setEditing(line)}><Pencil size={16} aria-hidden /></button></td>
      </tr>)}</tbody>
    </table>{!loading && !visible.length && <div className="p-8 text-center text-sm text-slate-600">{lines.length ? "No costs match these filters." : `No costs for ${monthLabel(month)} yet. Add them, or copy the fixed costs from the previous month.`}</div>}</div>

    {editing && <CostLineDialog line={editing === "new" ? null : editing} month={month} homes={homes} onClose={() => setEditing(null)} onSaved={async text => { setEditing(null); setMessage(text); await load(); }} />}
  </section>;
}

function CostLineDialog({ line, month, homes, onClose, onSaved }: { line: CostLine | null; month: string; homes: MonthHome[]; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ home: line?.home_id ?? homes.find(home => home.active)?.id ?? OFFICE, section: line?.section ?? "Fixed" as CostSection, description: line?.description ?? "", amount: line ? String(Number(line.amount_gbp)) : "", recurring: line?.recurring ?? true, notes: line?.notes ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (form.description.trim().length < 2) { setError("Describe the cost."); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim())) { setError("Enter an amount in pounds."); return; }
    const values = { period_month: line?.period_month ?? month, home_id: form.home === OFFICE ? null : form.home, section: form.section, description: form.description.trim(), amount_gbp: Number(form.amount), recurring: form.recurring, notes: form.notes.trim() };
    setBusy(true);
    const result = line
      ? await supabase.from("finance_cost_lines").update({ ...values, version: line.version + 1 }).eq("id", line.id).eq("version", line.version).select("id").maybeSingle()
      : await supabase.from("finance_cost_lines").insert(values).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This cost changed. Close and open it again."); return; }
    await onSaved(line ? "Cost updated." : "Cost added.");
  }
  async function remove() {
    if (!line || !window.confirm(`Delete “${line.description}”? This cannot be undone.`)) return;
    setBusy(true);
    const result = await supabase.from("finance_cost_lines").delete().eq("id", line.id).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "The cost could not be deleted."); return; }
    await onSaved("Cost deleted.");
  }
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{line ? "Edit cost" : `Add cost · ${monthLabel(month)}`}</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MaintenanceSelectField name="cost-house" label="House" value={form.home} options={[...homes.map(home => ({ value: home.id, label: home.active ? home.name : `${home.name} (inactive)` })), { value: OFFICE, label: "Office & management" }]} onChange={value => setForm(current => ({ ...current, home: value }))} />
        <MaintenanceSelectField name="cost-section" label="Type" value={form.section} options={[{ value: "Fixed", label: "Fixed (rent, bills, direct debits)" }, { value: "Allowances", label: "Allowances" }, { value: "Variable", label: "Variable (transport, repairs, other)" }]} onChange={value => setForm(current => ({ ...current, section: value as CostSection }))} />
        <label className="text-sm font-medium">Cost<input className={hrFieldClass} value={form.description} maxLength={120} placeholder="e.g. Rent, Broadband, Taxi" onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label>
        <label className="text-sm font-medium">Amount (£)<input type="number" min="0" step="0.01" className={hrFieldClass} value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium sm:col-span-2"><input type="checkbox" className="size-5 accent-teal-700" checked={form.recurring} onChange={event => setForm(current => ({ ...current, recurring: event.target.checked }))} />Repeats every month (copied by “Copy fixed costs”, and flagged if it goes missing)</label>
      </div>
      <label className="block text-sm font-medium">Notes<textarea className={hrFieldClass} rows={2} maxLength={1000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
      <div className="flex flex-wrap justify-between gap-3">
        {line ? <button type="button" className={`${button} text-rose-800`} disabled={busy} onClick={() => void remove()}><Trash2 size={17} aria-hidden />Delete</button> : <div />}
        <div className="flex gap-3"><button type="button" className={button} onClick={onClose}>Cancel</button><button type="button" className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save cost"}</button></div>
      </div>
    </div>
  </DialogContent></Dialog>;
}

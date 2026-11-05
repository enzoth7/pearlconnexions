"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HrFilterHeader } from "@/components/hr-register-controls";
import { MaintenanceChoiceField, MaintenanceSelectField } from "@/components/maintenance-select";
import { londonToday } from "@/lib/qa-capture";
import { safetyCheckCounts, safetyCheckState, safetyCheckTypes, type SafetyCheck } from "@/lib/maintenance-safety";
import { supabase } from "../../../src/shims/supabase";
import type { Home } from "@/lib/types";

type Form = { home_id: string; check_type: string; item_label: string; last_completed_on: string; next_due_on: string; certificate_reference: string; provider: string; notes: string };
const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#102c39] focus-visible:outline-2 focus-visible:outline-teal-700";
const blank = (homeId = ""): Form => ({ home_id: homeId, check_type: "Gas safety", item_label: "Whole home", last_completed_on: "", next_due_on: "", certificate_reference: "", provider: "", notes: "" });
const fromRow = (row: SafetyCheck): Form => ({ home_id: row.home_id, check_type: row.check_type, item_label: row.item_label, last_completed_on: row.last_completed_on ?? "", next_due_on: row.next_due_on, certificate_reference: row.certificate_reference, provider: row.provider, notes: row.notes });
const tone = (state: string) => state === "Overdue" ? "bg-rose-100 text-rose-900" : state === "Due soon" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900";

export function MaintenanceSafetySummary({ homes }: { homes: Home[] }) {
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void supabase.from("maintenance_safety_checks").select("*").then(result => {
      if (active) { setChecks((result.data ?? []) as SafetyCheck[]); setError(result.error?.message ?? ""); setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  const counts = safetyCheckCounts(checks, londonToday());
  const missing = homes.reduce((total, home) => total + ["Gas safety", "EICR", "PAT"].filter(type => !checks.some(check => check.home_id === home.id && check.check_type === type)).length, 0);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="bg-[#102c39] px-5 py-4 text-white"><h2 className="text-lg font-semibold">Property checks & certificates</h2></div>
    <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
      <div><div className="text-sm text-slate-600">Overdue</div><strong className="text-2xl tabular-nums text-rose-700">{loading || error ? "—" : counts.overdue}</strong></div>
      <div><div className="text-sm text-slate-600">Due within 30 days</div><strong className="text-2xl tabular-nums text-amber-700">{loading || error ? "—" : counts.dueSoon}</strong></div>
      <div><div className="text-sm text-slate-600">Gas / EICR / PAT records missing</div><strong className="text-2xl tabular-nums text-amber-700">{loading || error ? "—" : missing}</strong></div>
      <Link href="/maintenance/checks" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold text-teal-800">View checks</Link>
    </div>
    {!loading && !error && missing > 0 && <div className="border-t border-slate-200 px-5 py-3 text-sm text-slate-600">Confirm which checks apply at each home; missing records are not counted as overdue.</div>}
    {error && <div role="alert" className="border-t border-slate-200 px-5 py-3 text-sm text-rose-800">{error}</div>}
  </section>;
}

export function MaintenanceSafetyChecks({ homes, canManageMaintenance }: { homes: Home[]; canManageMaintenance: boolean }) {
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SafetyCheck | "new" | null>(null);
  const [form, setForm] = useState<Form>(() => blank(homes[0]?.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({ home: "", type: "", item: "", due: "", state: "" });
  const today = londonToday();
  const load = useCallback(async () => {
    const result = await supabase.from("maintenance_safety_checks").select("*").order("next_due_on");
    setChecks((result.data ?? []) as SafetyCheck[]);
    setError(result.error?.message ?? "");
  }, []);
  useEffect(() => { void load(); }, [load]);
  const homeName = (id: string) => homes.find(home => home.id === id)?.name ?? "—";
  const shown = checks.filter(row => (!filters.home || row.home_id === filters.home) && (!filters.type || row.check_type === filters.type)
    && (!filters.item || row.item_label.toLowerCase().includes(filters.item.toLowerCase()))
    && (!filters.due || row.next_due_on === filters.due) && (!filters.state || safetyCheckState(row, today) === filters.state));
  const set = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }));
  function open(row?: SafetyCheck) { setForm(row ? fromRow(row) : blank(homes[0]?.id)); setEditing(row ?? "new"); setErrors({}); setError(""); }
  async function save() {
    const next: Record<string, string> = {};
    if (!form.home_id) next.home_id = "Select a home.";
    if (!safetyCheckTypes.includes(form.check_type as typeof safetyCheckTypes[number])) next.check_type = "Select a check type.";
    if (form.item_label.trim().length < 2) next.item_label = "Enter an area or item.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.next_due_on)) next.next_due_on = "Enter the next due date.";
    if (form.last_completed_on && form.next_due_on && form.last_completed_on > form.next_due_on) next.last_completed_on = "The last check cannot be after the next due date.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const values = { ...form, item_label: form.item_label.trim(), last_completed_on: form.last_completed_on || null,
      certificate_reference: form.certificate_reference.trim(), provider: form.provider.trim(), notes: form.notes.trim() };
    setBusy(true);
    const result = editing !== "new" && editing
      ? await supabase.from("maintenance_safety_checks").update({ ...values, version: editing.version + 1 }).eq("id", editing.id).eq("version", editing.version).select().maybeSingle()
      : await supabase.from("maintenance_safety_checks").insert(values).select().maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This check changed. Reload and try again."); return; }
    setEditing(null); await load();
  }
  const filter = (key: keyof typeof filters, label: string, options?: string[] | { value: string; label: string }[], type: "text" | "date" = "text") =>
    <HrFilterHeader id={`safety-${key}`} label={label} value={filters[key]} options={options} type={type} dark onChange={value => setFilters(current => ({ ...current, [key]: value }))} />;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold text-[#102c39]">Checks & certificates</h1><div className="mt-2 text-sm text-slate-600">Next due dates for property checks and certificates.</div></div>
      {canManageMaintenance && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white" onClick={() => open()}><Plus size={18} aria-hidden />Add check</button>}</header>
    {error && !editing && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm"><thead className="bg-[#102c39] text-white"><tr>
      <th scope="col" className="px-3 py-3">{filter("home", "Home", homes.map(home => ({ value: home.id, label: home.name })))}</th>
      <th scope="col" className="px-3 py-3">{filter("type", "Check", [...safetyCheckTypes])}</th>
      <th scope="col" className="hidden px-3 py-3 lg:table-cell">{filter("item", "Area / item")}</th>
      <th scope="col" className="px-3 py-3">{filter("due", "Next due", undefined, "date")}</th>
      <th scope="col" className="px-3 py-3">{filter("state", "State", ["Overdue", "Due soon", "Current"])}</th>
      <th scope="col" className="w-14 px-2 py-3"><div className="sr-only">Details</div></th>
    </tr></thead><tbody className="divide-y divide-slate-200">{shown.map(row => <tr key={row.id}>
      <td className="break-words px-3 py-3 font-medium">{homeName(row.home_id)}</td><td className="break-words px-3 py-3">{row.check_type}</td>
      <td className="hidden break-words px-3 py-3 lg:table-cell">{row.item_label}</td><td className="px-3 py-3 tabular-nums">{row.next_due_on}</td>
      <td className="px-3 py-3"><strong className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone(safetyCheckState(row, today))}`}>{safetyCheckState(row, today)}</strong></td>
      <td className="px-2 py-3"><button type="button" className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" aria-label={`Open ${row.check_type} for ${homeName(row.home_id)}`} onClick={() => open(row)}>{canManageMaintenance ? <Pencil size={17} aria-hidden /> : <Plus size={17} aria-hidden />}</button></td>
    </tr>)}</tbody></table>{!shown.length && <div className="p-6 text-center text-sm text-slate-600">{checks.length ? "No checks match these filters." : "No checks recorded yet."}</div>}</div>
    <Dialog open={Boolean(editing)} onOpenChange={value => { if (!value && !busy) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Add check" : "Check details"}</DialogTitle></DialogHeader>
      <fieldset disabled={busy || !canManageMaintenance} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MaintenanceSelectField name="check-home" label="Home" value={form.home_id} options={homes.map(home => ({ value: home.id, label: home.name }))} disabled={editing !== "new"} error={errors.home_id} onChange={value => set("home_id", value)} />
        <MaintenanceSelectField name="check-type" label="Check type" value={form.check_type} options={[...safetyCheckTypes]} error={errors.check_type} onChange={value => set("check_type", value)} />
        <MaintenanceChoiceField name="check-item" label="Area / item" value={form.item_label} values={["Whole home", "Boiler room", "Kitchen", "Electrical installation", "Portable equipment", "Fire system"]} error={errors.item_label} onChange={value => set("item_label", value)} />
        <label className="text-sm font-medium">Last completed<input type="date" className={inputClass} value={form.last_completed_on} onChange={event => set("last_completed_on", event.target.value)} />{errors.last_completed_on && <div className="mt-1 text-sm text-rose-800">{errors.last_completed_on}</div>}</label>
        <label className="text-sm font-medium">Next due<input type="date" className={inputClass} value={form.next_due_on} onChange={event => set("next_due_on", event.target.value)} aria-invalid={Boolean(errors.next_due_on)} />{errors.next_due_on && <div className="mt-1 text-sm text-rose-800">{errors.next_due_on}</div>}</label>
        <label className="text-sm font-medium">Certificate reference<input className={inputClass} maxLength={120} value={form.certificate_reference} onChange={event => set("certificate_reference", event.target.value)} /></label>
        <label className="text-sm font-medium">Provider<input className={inputClass} maxLength={120} value={form.provider} onChange={event => set("provider", event.target.value)} /></label>
        <label className="text-sm font-medium sm:col-span-2">Notes<textarea className={inputClass} rows={3} maxLength={4000} value={form.notes} onChange={event => set("notes", event.target.value)} /></label>
      </fieldset>
      {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
      <div className="flex justify-end gap-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setEditing(null)}>Close</button>{canManageMaintenance && <button type="button" disabled={busy} className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" onClick={() => void save()}>{busy ? "Saving…" : "Save check"}</button>}</div>
    </DialogContent></Dialog>
  </div>;
}

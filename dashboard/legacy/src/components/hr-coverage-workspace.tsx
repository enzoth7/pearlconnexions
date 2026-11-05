"use client";

import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { HrFilterHeader, hrDate, hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { supabase } from "../../../src/shims/supabase";

type Home = { id: string; name: string };
type Shift = {
  id: string; home_id: string; shift_on: string; shift_type: string;
  required_staff: number | null; planned_staff: number | null; present_staff: number | null;
  agency_staff: number | null; overtime_hours: number | null;
  commissioned_support_hours: number | null; delivered_support_hours: number | null;
  commissioned_one_to_one_hours: number | null; delivered_one_to_one_hours: number | null;
  commissioned_two_to_one_hours: number | null; delivered_two_to_one_hours: number | null;
  notes: string; version: number;
};
type ShiftForm = { home_id: string; shift_on: string; shift_type: string; required_staff: string; planned_staff: string; present_staff: string; agency_staff: string; overtime_hours: string; commissioned_support_hours: string; delivered_support_hours: string; commissioned_one_to_one_hours: string; delivered_one_to_one_hours: string; commissioned_two_to_one_hours: string; delivered_two_to_one_hours: string; notes: string };
const shiftTypes = ["Day", "Evening", "Waking night", "Sleep-in", "Other"];
const countFields = ["required_staff", "planned_staff", "present_staff", "agency_staff"] as const;
const hourFields = ["overtime_hours", "commissioned_support_hours", "delivered_support_hours", "commissioned_one_to_one_hours", "delivered_one_to_one_hours", "commissioned_two_to_one_hours", "delivered_two_to_one_hours"] as const;
const numberFields: { key: (typeof countFields)[number] | (typeof hourFields)[number]; label: string; unit: string }[] = [
  { key: "required_staff", label: "Staff required", unit: "people" },
  { key: "planned_staff", label: "Staff planned", unit: "people" },
  { key: "present_staff", label: "Staff present", unit: "people" },
  { key: "agency_staff", label: "Agency staff", unit: "people" },
  { key: "overtime_hours", label: "Overtime", unit: "hours" },
  { key: "commissioned_support_hours", label: "Support commissioned", unit: "hours" },
  { key: "delivered_support_hours", label: "Support delivered", unit: "hours" },
  { key: "commissioned_one_to_one_hours", label: "1:1 support commissioned", unit: "hours" },
  { key: "delivered_one_to_one_hours", label: "1:1 support delivered", unit: "hours" },
  { key: "commissioned_two_to_one_hours", label: "2:1 support commissioned", unit: "hours" },
  { key: "delivered_two_to_one_hours", label: "2:1 support delivered", unit: "hours" },
];
function blankShift(): ShiftForm {
  return { home_id: "", shift_on: londonToday(), shift_type: "Day", required_staff: "", planned_staff: "", present_staff: "", agency_staff: "", overtime_hours: "", commissioned_support_hours: "", delivered_support_hours: "", commissioned_one_to_one_hours: "", delivered_one_to_one_hours: "", commissioned_two_to_one_hours: "", delivered_two_to_one_hours: "", notes: "" };
}
function asForm(row: Shift): ShiftForm {
  return { home_id: row.home_id, shift_on: row.shift_on, shift_type: row.shift_type,
    required_staff: String(row.required_staff ?? ""), planned_staff: String(row.planned_staff ?? ""), present_staff: String(row.present_staff ?? ""), agency_staff: String(row.agency_staff ?? ""),
    overtime_hours: String(row.overtime_hours ?? ""), commissioned_support_hours: String(row.commissioned_support_hours ?? ""), delivered_support_hours: String(row.delivered_support_hours ?? ""),
    commissioned_one_to_one_hours: String(row.commissioned_one_to_one_hours ?? ""), delivered_one_to_one_hours: String(row.delivered_one_to_one_hours ?? ""),
    commissioned_two_to_one_hours: String(row.commissioned_two_to_one_hours ?? ""), delivered_two_to_one_hours: String(row.delivered_two_to_one_hours ?? ""), notes: row.notes };
}
function coverage(row: Shift) {
  if (row.required_staff === null || row.present_staff === null) return "Pending";
  return row.present_staff < row.required_staff ? "Short staffed" : "Covered";
}
function coverageTone(value: string) {
  return value === "Covered" ? "bg-emerald-100 text-emerald-900" : value === "Short staffed" ? "bg-rose-100 text-rose-900" : "bg-slate-100 text-slate-700";
}

export function HrCoverageWorkspace() {
  const [rows, setRows] = useState<Shift[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Shift | null>(null);
  const [editing, setEditing] = useState<Shift | "new" | null>(null);
  const [form, setForm] = useState<ShiftForm>(blankShift);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [shifts, houses] = await Promise.all([
      supabase.from("hr_coverage_shifts").select("*").order("shift_on", { ascending: false }),
      supabase.from("qa_homes").select("id,name").eq("active", true).order("name"),
    ]);
    setRows((shifts.data ?? []) as Shift[]);
    setHomes((houses.data ?? []) as Home[]);
    setError(shifts.error?.message ?? houses.error?.message ?? "");
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const homeName = (id: string) => homes.find(home => home.id === id)?.name ?? "—";
  const visible = rows.filter(row =>
    (!filters.date || row.shift_on === filters.date) &&
    (!filters.home || row.home_id === filters.home) &&
    (!filters.shift || row.shift_type === filters.shift) &&
    (!filters.coverage || coverage(row) === filters.coverage));
  function open(row?: Shift) { setForm(row ? asForm(row) : blankShift()); setEditing(row ?? "new"); setErrors({}); setError(""); }
  async function save() {
    const next: Record<string, string> = {};
    if (!form.home_id) next.home_id = "Select a home.";
    if (!form.shift_on) next.shift_on = "Enter a date.";
    if (!shiftTypes.includes(form.shift_type)) next.shift_type = "Select a shift.";
    for (const key of countFields) if (form[key] && (!/^\d+$/.test(form[key]) || Number(form[key]) > 100)) next[key] = "Enter a whole number from 0 to 100.";
    for (const key of hourFields) if (form[key] && (!/^\d+(\.\d{1,2})?$/.test(form[key]) || Number(form[key]) > 9999)) next[key] = "Enter hours from 0 to 9999.";
    if (form.agency_staff && form.present_staff && Number(form.agency_staff) > Number(form.present_staff)) next.agency_staff = "Agency staff cannot exceed staff present.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const count = (value: string) => value === "" ? null : Number(value);
    const values = { home_id: form.home_id, shift_on: form.shift_on, shift_type: form.shift_type,
      required_staff: count(form.required_staff), planned_staff: count(form.planned_staff), present_staff: count(form.present_staff), agency_staff: count(form.agency_staff),
      overtime_hours: count(form.overtime_hours), commissioned_support_hours: count(form.commissioned_support_hours), delivered_support_hours: count(form.delivered_support_hours),
      commissioned_one_to_one_hours: count(form.commissioned_one_to_one_hours), delivered_one_to_one_hours: count(form.delivered_one_to_one_hours),
      commissioned_two_to_one_hours: count(form.commissioned_two_to_one_hours), delivered_two_to_one_hours: count(form.delivered_two_to_one_hours), notes: form.notes.trim() };
    setBusy(true);
    const result = editing !== "new" && editing
      ? await supabase.from("hr_coverage_shifts").update({ ...values, version: editing.version + 1 }).eq("id", editing.id).eq("version", editing.version).select().maybeSingle()
      : await supabase.from("hr_coverage_shifts").insert(values).select().maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This shift changed. Reload and try again."); return; }
    setEditing(null); setError(""); await load();
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold text-[#102c39]">Coverage</h1><div className="mt-2 text-sm text-slate-600">Staffing by home and shift.</div></div><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white" onClick={() => open()}><Plus size={18} aria-hidden />Add shift</button></header>
    {error && !editing && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6">Loading shifts…</div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm"><caption className="sr-only">Coverage by home and shift</caption>
      <thead><tr><th scope="col" className="px-3 py-2"><HrFilterHeader id="coverage-date" label="Date" type="date" value={filters.date ?? ""} onChange={value => setFilters(current => ({ ...current, date: value }))} /></th><th scope="col" className="hidden px-3 py-2 sm:table-cell"><HrFilterHeader id="coverage-home" label="Home" value={filters.home ?? ""} options={homes.map(home => ({ value: home.id, label: home.name }))} onChange={value => setFilters(current => ({ ...current, home: value }))} /></th><th scope="col" className="px-3 py-2"><HrFilterHeader id="coverage-shift" label="Shift" value={filters.shift ?? ""} options={shiftTypes} onChange={value => setFilters(current => ({ ...current, shift: value }))} /></th><th scope="col" className="hidden px-3 py-2 lg:table-cell">Required</th><th scope="col" className="hidden px-3 py-2 lg:table-cell">Planned</th><th scope="col" className="hidden px-3 py-2 lg:table-cell">Present</th><th scope="col" className="px-3 py-2"><HrFilterHeader id="coverage-state" label="Coverage" value={filters.coverage ?? ""} options={["Covered", "Short staffed", "Pending"]} onChange={value => setFilters(current => ({ ...current, coverage: value }))} /></th><th scope="col" className="w-14 px-2 py-2"><div className="sr-only">Details</div></th></tr></thead>
      <tbody className="divide-y divide-slate-200">{visible.map(row => <tr key={row.id}><td className="break-words px-3 py-2">{hrDate(row.shift_on)}</td><td className="hidden break-words px-3 py-2 sm:table-cell">{homeName(row.home_id)}</td><td className="break-words px-3 py-2">{row.shift_type}</td><td className="hidden px-3 py-2 lg:table-cell">{row.required_staff ?? "—"}</td><td className="hidden px-3 py-2 lg:table-cell">{row.planned_staff ?? "—"}</td><td className="hidden px-3 py-2 lg:table-cell">{row.present_staff ?? "—"}</td><td className="px-3 py-2"><strong className={`inline-block rounded-lg px-2 py-1 text-xs ${coverageTone(coverage(row))}`}>{coverage(row)}</strong></td><td className="px-2 py-2"><button type="button" aria-label={`Show ${row.shift_type} shift at ${homeName(row.home_id)} on ${row.shift_on}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setDetails(row)}><Plus size={18} aria-hidden /></button></td></tr>)}</tbody>
    </table>{!visible.length && <div className="p-8 text-center text-sm text-slate-600">{rows.length ? "No shifts match these filters." : "No shifts recorded yet."}</div>}</div>}
    <Dialog open={Boolean(details)} onOpenChange={value => { if (!value) setDetails(null); }}><DialogContent><DialogHeader><DialogTitle>{details ? `${homeName(details.home_id)} · ${details.shift_type}` : "Shift details"}</DialogTitle><div className="text-sm text-slate-600">{hrDate(details?.shift_on ?? null)}</div></DialogHeader>{details && <><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
      ["Staff required", details.required_staff, "people"], ["Staff planned", details.planned_staff, "people"], ["Staff present", details.present_staff, "people"], ["Agency staff", details.agency_staff, "people"],
      ["Overtime", details.overtime_hours, "hours"], ["Support commissioned", details.commissioned_support_hours, "hours"], ["Support delivered", details.delivered_support_hours, "hours"],
      ["1:1 commissioned", details.commissioned_one_to_one_hours, "hours"], ["1:1 delivered", details.delivered_one_to_one_hours, "hours"],
      ["2:1 commissioned", details.commissioned_two_to_one_hours, "hours"], ["2:1 delivered", details.delivered_two_to_one_hours, "hours"],
    ].map(([label, value, unit]) => <div key={String(label)} className="border-b border-slate-200 pb-2"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-[#102c39]">{value === null ? "—" : `${value} ${unit}`}</dd></div>)}</dl>{details.notes && <div><h3 className="text-sm font-semibold text-[#102c39]">Notes</h3><div className="mt-1 whitespace-pre-wrap text-sm">{details.notes}</div></div>}<div className="flex justify-end border-t border-slate-200 pt-4"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-teal-800" onClick={() => { const row = details; setDetails(null); open(row); }}><Pencil size={17} aria-hidden />Edit shift</button></div></>}</DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={value => { if (!value && !busy) { setEditing(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Add shift" : "Edit shift"}</DialogTitle><div className="text-sm text-slate-600">Enter confirmed numbers; leave unknown amounts blank.</div></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><MaintenanceSelectField name="coverage-form-home" label="Home" value={form.home_id || "__select__"} options={[{ value: "__select__", label: "Select home" }, ...homes.map(home => ({ value: home.id, label: home.name }))]} onChange={value => setForm(current => ({ ...current, home_id: value === "__select__" ? "" : value }))} error={errors.home_id} /><label className="text-sm font-medium">Date<input type="date" className={hrFieldClass} value={form.shift_on} onChange={event => setForm(current => ({ ...current, shift_on: event.target.value }))} />{errors.shift_on && <div className="mt-1 text-sm text-rose-800">{errors.shift_on}</div>}</label><MaintenanceSelectField name="coverage-form-shift" label="Shift" value={form.shift_type} options={shiftTypes} onChange={value => setForm(current => ({ ...current, shift_type: value }))} error={errors.shift_type} />
        {numberFields.map(field => <label key={field.key} className="text-sm font-medium">{field.label} ({field.unit})<input type="number" min="0" step={countFields.includes(field.key as typeof countFields[number]) ? "1" : "0.25"} className={hrFieldClass} value={form[field.key]} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} />{errors[field.key] && <div className="mt-1 text-sm text-rose-800">{errors[field.key]}</div>}</label>)}
      </div><label className="text-sm font-medium">Notes<textarea className={hrFieldClass} rows={3} maxLength={4000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>{error && <div role="alert" className="text-sm text-rose-800">{error}</div>}<div className="flex justify-end gap-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save shift"}</button></div>
    </DialogContent></Dialog>
  </div>;
}

"use client";

import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaintenanceChoiceField, MaintenanceSelectField } from "@/components/maintenance-select";
import { HrFilterHeader, hrDate, hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { supabase } from "../../../src/shims/supabase";

type Candidate = {
  id: string; candidate_name: string; role_title: string; home_id: string | null; owner_manager_id: string | null;
  stage: string; applied_on: string; interview_on: string | null; references_status: string; dbs_status: string;
  notes: string; version: number;
};
type CandidateForm = { candidate_name: string; role_title: string; home_id: string; owner_manager_id: string; stage: string; applied_on: string; interview_on: string; references_status: string; dbs_status: string; notes: string };
type Home = { id: string; name: string };
type Manager = { id: string; name: string };
const stages = ["Applied", "Shortlisted", "Interview", "References", "Offer", "Hired", "Withdrawn"];
const references = ["Pending", "In progress", "Verified"];
const dbsStates = ["Pending", "In progress", "Cleared", "Concern"];
const roles = ["Support Worker", "Senior Support Worker", "Key Worker", "Deputy Manager", "Registered Manager"];
function blankCandidate(managerId: string | null): CandidateForm {
  return { candidate_name: "", role_title: "", home_id: "", owner_manager_id: managerId ?? "", stage: "Applied", applied_on: londonToday(), interview_on: "", references_status: "Pending", dbs_status: "Pending", notes: "" };
}
function asForm(row: Candidate): CandidateForm {
  return { candidate_name: row.candidate_name, role_title: row.role_title, home_id: row.home_id ?? "", owner_manager_id: row.owner_manager_id ?? "", stage: row.stage, applied_on: row.applied_on, interview_on: row.interview_on ?? "", references_status: row.references_status, dbs_status: row.dbs_status, notes: row.notes };
}
function stageTone(value: string) {
  return value === "Hired" ? "bg-emerald-100 text-emerald-900" : value === "Withdrawn" ? "bg-slate-100 text-slate-700" : value === "Offer" ? "bg-violet-100 text-violet-900" : value === "References" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900";
}

export function HrRecruitmentWorkspace({ canEdit, managerId }: { canEdit: boolean; managerId: string | null }) {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Candidate | null>(null);
  const [editing, setEditing] = useState<Candidate | "new" | null>(null);
  const [form, setForm] = useState<CandidateForm>(() => blankCandidate(managerId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [candidates, houses, leads] = await Promise.all([
      supabase.from("hr_recruitment_candidates").select("*").order("applied_on", { ascending: false }),
      supabase.from("qa_homes").select("id,name").eq("active", true).order("name"),
      supabase.from("managers").select("id,name").order("name"),
    ]);
    setRows((candidates.data ?? []) as Candidate[]);
    setHomes((houses.data ?? []) as Home[]);
    setManagers((leads.data ?? []) as Manager[]);
    setError(candidates.error?.message ?? houses.error?.message ?? leads.error?.message ?? "");
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const homeName = (id: string | null) => homes.find(home => home.id === id)?.name ?? "—";
  const managerName = (id: string | null) => managers.find(manager => manager.id === id)?.name ?? "—";
  const visible = rows.filter(row =>
    (!filters.name || row.candidate_name.toLowerCase().includes(filters.name.toLowerCase())) &&
    (!filters.role || row.role_title === filters.role) && (!filters.home || row.home_id === filters.home) &&
    (!filters.stage || row.stage === filters.stage) && (!filters.applied || row.applied_on === filters.applied) &&
    (!filters.references || row.references_status === filters.references) && (!filters.dbs || row.dbs_status === filters.dbs));
  function open(row?: Candidate) { setForm(row ? asForm(row) : blankCandidate(managerId)); setEditing(row ?? "new"); setErrors({}); setError(""); }
  async function save() {
    const next: Record<string, string> = {};
    if (form.candidate_name.trim().length < 2) next.candidate_name = "Enter the candidate's name.";
    if (form.role_title.trim().length < 2) next.role_title = "Enter a role.";
    if (!form.applied_on) next.applied_on = "Enter the application date.";
    if (form.interview_on && form.applied_on && form.interview_on < form.applied_on) next.interview_on = "Interview cannot precede the application.";
    if (!stages.includes(form.stage)) next.stage = "Select a stage.";
    if (!references.includes(form.references_status)) next.references_status = "Select a reference status.";
    if (!dbsStates.includes(form.dbs_status)) next.dbs_status = "Select a DBS status.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const values = { candidate_name: form.candidate_name.trim(), role_title: form.role_title.trim(), home_id: form.home_id || null,
      owner_manager_id: (managerId ?? form.owner_manager_id) || null, stage: form.stage, applied_on: form.applied_on,
      interview_on: form.interview_on || null, references_status: form.references_status, dbs_status: form.dbs_status, notes: form.notes.trim() };
    setBusy(true);
    const result = editing !== "new" && editing
      ? await supabase.from("hr_recruitment_candidates").update({ ...values, version: editing.version + 1 }).eq("id", editing.id).eq("version", editing.version).select().maybeSingle()
      : await supabase.from("hr_recruitment_candidates").insert(values).select().maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This candidate changed. Reload and try again."); return; }
    setEditing(null); setError(""); await load();
  }
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold text-[#102c39]">Recruitment</h1><div className="mt-2 text-sm text-slate-600">Track candidates, interviews, references and checks.</div></div>{canEdit && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white" onClick={() => open()}><Plus size={18} aria-hidden />Add candidate</button>}</header>
    {error && !editing && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6">Loading candidates…</div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm"><caption className="sr-only">Recruitment candidates by stage</caption><thead><tr>
      <th scope="col" className="px-3 py-2"><HrFilterHeader id="recruit-name" label="Candidate" value={filters.name ?? ""} onChange={value => setFilters(current => ({ ...current, name: value }))} /></th><th scope="col" className="hidden px-3 py-2 md:table-cell"><HrFilterHeader id="recruit-role" label="Role" value={filters.role ?? ""} options={[...new Set(rows.map(row => row.role_title))].sort()} onChange={value => setFilters(current => ({ ...current, role: value }))} /></th><th scope="col" className="hidden px-3 py-2 sm:table-cell"><HrFilterHeader id="recruit-home" label="Home" value={filters.home ?? ""} options={homes.map(home => ({ value: home.id, label: home.name }))} onChange={value => setFilters(current => ({ ...current, home: value }))} /></th><th scope="col" className="px-3 py-2"><HrFilterHeader id="recruit-stage" label="Stage" value={filters.stage ?? ""} options={stages} onChange={value => setFilters(current => ({ ...current, stage: value }))} /></th><th scope="col" className="hidden px-3 py-2 lg:table-cell"><HrFilterHeader id="recruit-applied" label="Applied" type="date" value={filters.applied ?? ""} onChange={value => setFilters(current => ({ ...current, applied: value }))} /></th><th scope="col" className="hidden px-3 py-2 xl:table-cell"><HrFilterHeader id="recruit-references" label="References" value={filters.references ?? ""} options={references} onChange={value => setFilters(current => ({ ...current, references: value }))} /></th><th scope="col" className="hidden px-3 py-2 xl:table-cell"><HrFilterHeader id="recruit-dbs" label="DBS" value={filters.dbs ?? ""} options={dbsStates} onChange={value => setFilters(current => ({ ...current, dbs: value }))} /></th><th scope="col" className="w-14 px-2 py-2"><div className="sr-only">Details</div></th>
    </tr></thead><tbody className="divide-y divide-slate-200">{visible.map(row => <tr key={row.id}><td className="break-words px-3 py-2.5 font-semibold text-[#102c39]">{row.candidate_name}</td><td className="hidden break-words px-3 py-2.5 md:table-cell">{row.role_title}</td><td className="hidden break-words px-3 py-2.5 sm:table-cell">{homeName(row.home_id)}</td><td className="px-3 py-2.5"><strong className={`inline-block rounded-lg px-2 py-1 text-xs ${stageTone(row.stage)}`}>{row.stage}</strong></td><td className="hidden px-3 py-2.5 lg:table-cell">{hrDate(row.applied_on)}</td><td className="hidden px-3 py-2.5 xl:table-cell">{row.references_status}</td><td className="hidden px-3 py-2.5 xl:table-cell">{row.dbs_status}</td><td className="px-2 py-2"><button type="button" aria-label={`Show details for ${row.candidate_name}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setDetails(row)}><Plus size={18} aria-hidden /></button></td></tr>)}</tbody></table>{!visible.length && <div className="p-8 text-center text-sm text-slate-600">{rows.length ? "No candidates match these filters." : "No candidates recorded yet."}</div>}</div>}
    <Dialog open={Boolean(details)} onOpenChange={value => { if (!value) setDetails(null); }}><DialogContent><DialogHeader><DialogTitle>{details?.candidate_name ?? "Candidate details"}</DialogTitle><div className="text-sm text-slate-600">{details?.role_title}</div></DialogHeader>{details && <><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
      ["Home", homeName(details.home_id)], ["Owner", managerName(details.owner_manager_id)], ["Stage", details.stage], ["Applied", hrDate(details.applied_on)], ["Interview", hrDate(details.interview_on)], ["References", details.references_status], ["DBS", details.dbs_status],
    ].map(([label, value]) => <div key={label} className="border-b border-slate-200 pb-2"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-[#102c39]">{value}</dd></div>)}</dl>{details.notes && <div><h3 className="text-sm font-semibold text-[#102c39]">Notes</h3><div className="mt-1 whitespace-pre-wrap text-sm">{details.notes}</div></div>}{canEdit && (!managerId || details.owner_manager_id === managerId) && <div className="flex justify-end border-t border-slate-200 pt-4"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-teal-800" onClick={() => { const row = details; setDetails(null); open(row); }}><Pencil size={17} aria-hidden />Edit candidate</button></div>}</>}</DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={value => { if (!value && !busy) { setEditing(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Add candidate" : "Edit candidate"}</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium">Candidate name<input className={hrFieldClass} value={form.candidate_name} maxLength={120} onChange={event => setForm(current => ({ ...current, candidate_name: event.target.value }))} />{errors.candidate_name && <div className="mt-1 text-sm text-rose-800">{errors.candidate_name}</div>}</label><MaintenanceChoiceField name="recruit-form-role" label="Role" value={form.role_title} values={roles} onChange={value => setForm(current => ({ ...current, role_title: value }))} error={errors.role_title} /><MaintenanceSelectField name="recruit-form-home" label="Home" value={form.home_id || "__none__"} options={[{ value: "__none__", label: "Not assigned" }, ...homes.map(home => ({ value: home.id, label: home.name }))]} onChange={value => setForm(current => ({ ...current, home_id: value === "__none__" ? "" : value }))} />
      <MaintenanceSelectField name="recruit-form-stage" label="Stage" value={form.stage} options={stages} onChange={value => setForm(current => ({ ...current, stage: value }))} error={errors.stage} /><label className="text-sm font-medium">Applied on<input type="date" className={hrFieldClass} value={form.applied_on} onChange={event => setForm(current => ({ ...current, applied_on: event.target.value }))} />{errors.applied_on && <div className="mt-1 text-sm text-rose-800">{errors.applied_on}</div>}</label><label className="text-sm font-medium">Interview on<input type="date" className={hrFieldClass} value={form.interview_on} onChange={event => setForm(current => ({ ...current, interview_on: event.target.value }))} />{errors.interview_on && <div className="mt-1 text-sm text-rose-800">{errors.interview_on}</div>}</label>
      <MaintenanceSelectField name="recruit-form-references" label="References" value={form.references_status} options={references} onChange={value => setForm(current => ({ ...current, references_status: value }))} error={errors.references_status} /><MaintenanceSelectField name="recruit-form-dbs" label="DBS" value={form.dbs_status} options={dbsStates} onChange={value => setForm(current => ({ ...current, dbs_status: value }))} error={errors.dbs_status} />{!managerId && <MaintenanceSelectField name="recruit-form-owner" label="Owner" value={form.owner_manager_id || "__none__"} options={[{ value: "__none__", label: "Not assigned" }, ...managers.map(manager => ({ value: manager.id, label: manager.name }))]} onChange={value => setForm(current => ({ ...current, owner_manager_id: value === "__none__" ? "" : value }))} />}
    </div><label className="text-sm font-medium">Notes<textarea className={hrFieldClass} rows={3} maxLength={4000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>{error && <div role="alert" className="text-sm text-rose-800">{error}</div>}<div className="flex justify-end gap-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save candidate"}</button></div></DialogContent></Dialog>
  </div>;
}

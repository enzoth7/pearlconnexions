"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, Wrench } from "lucide-react";
import { useState, useTransition } from "react";
import { CaptureField } from "@/components/qa-case-fields";
import { HrFilterHeader } from "@/components/hr-register-controls";
import { MaintenanceChoiceField, MaintenanceSelectControl, MaintenanceSelectField } from "@/components/maintenance-select";
import { MaintenanceTimeline } from "@/components/maintenance-timeline";
import { MaintenanceSafetySummary } from "@/components/maintenance-safety-checks";
import { suggestedMaintenanceTarget, maintenanceTargets } from "@/lib/maintenance-safety";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveCase } from "@/lib/qa-cases-client";
import { caseErrors, caseStates, emptyCase, londonToday, maintenanceCategories, type CaseData, type CaseRecord } from "@/lib/qa-capture";
import type { Home } from "@/lib/types";

type Props = { homes: Home[]; records: CaseRecord[]; canManageMaintenance: boolean };
const priorityOptions = ["Low", "Moderate", "High", "Urgent"];
const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600";
const actionClass = "inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700";
const openStates = ["Reported", "In progress", "Awaiting external"];
const homeName = (homes: Home[], id: string) => homes.find(home => home.id === id)?.name ?? "—";

function statusTone(status: string, draft = false) {
  return draft ? "border-slate-200 bg-slate-100 text-slate-700"
    : status === "Completed" ? "border-emerald-200 bg-emerald-100 text-emerald-900"
    : status === "In progress" ? "border-sky-200 bg-sky-100 text-sky-900"
    : status === "Awaiting external" ? "border-violet-200 bg-violet-100 text-violet-900"
    : "border-amber-200 bg-amber-100 text-amber-900";
}

function badge(status: string, draft: boolean) {
  return <strong className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusTone(status, draft)}`}>{draft ? "Draft" : status}</strong>;
}

function priorityBadge(priority: string) {
  const tone = priority === "Urgent" ? "bg-red-100 text-red-800" : priority === "High" ? "bg-orange-100 text-orange-800" : priority === "Moderate" ? "bg-amber-100 text-amber-900" : priority === "Low" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600";
  return <strong className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${tone}`}>{priority || "—"}</strong>;
}

function ColumnFilter({ label, value, onChange, options, type = "text" }: { label: string; value: string; onChange: (value: string) => void; options?: { value: string; label: string }[]; type?: "text" | "date" }) {
  const id = `filter-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <HrFilterHeader id={id} label={label} value={value} options={options} type={type} dark onChange={onChange} />;
}

export function MaintenanceIssues({ homes, records, canManageMaintenance, historical = false }: Props & { historical?: boolean }) {
  const router = useRouter();
  const focus = useSearchParams().get("focus");
  const heading = focus === "open" ? "Open issues" : focus === "overdue" ? "Overdue issues" : focus === "high" ? "High / urgent issues" : focus === "completed-month" ? "Completed this month" : historical ? "Historical" : "Issues";
  const today = londonToday();
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [filters, setFilters] = useState({ reference: "", home: "", issue: "", category: "", priority: "", reported: "", target: "", status: "" });
  const setFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const setData = <K extends keyof CaseData>(key: K, value: CaseData[K]) => setSelected(current => current ? { ...current, data: { ...current.data, [key]: value } } : null);
  const setPriority = (priority: string) => setSelected(current => {
    if (!current) return null;
    const previousSuggestion = suggestedMaintenanceTarget(current.occurred_on, current.data.priority);
    const due_on = !current.data.due_on || current.data.due_on === previousSuggestion
      ? suggestedMaintenanceTarget(current.occurred_on, priority) : current.data.due_on;
    return { ...current, data: { ...current.data, priority, due_on } };
  });
  const setReportedOn = (occurred_on: string) => setSelected(current => {
    if (!current) return null;
    const previousSuggestion = suggestedMaintenanceTarget(current.occurred_on, current.data.priority);
    const due_on = !current.data.due_on || current.data.due_on === previousSuggestion
      ? suggestedMaintenanceTarget(occurred_on, current.data.priority) : current.data.due_on;
    return { ...current, occurred_on, data: { ...current.data, due_on } };
  });
  const data = selected?.data;
  const legacyRecord = Boolean(selected && selected.schema_version !== 2);
  const readonly = legacyRecord || Boolean(selected?.version && !canManageMaintenance);
  const ownerChoices = ["Maintenance lead", "Home manager", "External contractor", ...records.map(row => row.data.owner).filter(Boolean)];
  const providerChoices = ["In-house maintenance", "External contractor", ...records.map(row => row.data.provider).filter(Boolean)];
  const locationChoices = ["Entrance / reception", "Hallway", "Stairwell", "Shared lounge", "Dining room", "Kitchen", "Laundry / utility", "Bedroom", "Bathroom", "Toilet", "Office", "Staff room", "Medication room", "Boiler / plant room", "Storage", "Garden", "Driveway / parking", "Exterior / roof", "Outbuilding", ...records.map(row => row.data.location).filter(Boolean)];
  const shown = records.filter(row => {
    if (historical ? row.status !== "Completed" || row.is_draft : row.status === "Completed" && !row.is_draft) return false;
    if (focus === "open" && row.is_draft) return false;
    if (focus === "overdue" && (row.is_draft || !row.data.due_on || row.data.due_on >= today)) return false;
    if (focus === "high" && (row.is_draft || !["High", "Urgent"].includes(row.data.priority))) return false;
    if (focus === "completed-month" && !row.data.closed_on?.startsWith(today.slice(0, 7))) return false;
    const status = row.is_draft ? "Draft" : row.status;
    return (!filters.reference || (row.reference ?? "").toLowerCase().includes(filters.reference.toLowerCase()))
      && (!filters.home || row.home_id === filters.home)
      && (!filters.issue || `${row.title} ${row.data.description}`.toLowerCase().includes(filters.issue.toLowerCase()))
      && (!filters.category || row.data.category === filters.category)
      && (!filters.priority || row.data.priority === filters.priority)
      && (!filters.reported || row.occurred_on === filters.reported)
      && (!filters.target || row.data.due_on === filters.target)
      && (!filters.status || status === filters.status);
  });
  function open(row: CaseRecord) { setSelected(structuredClone(row)); setErrors({}); setMessage(""); }
  function persist(draft: boolean) {
    if (!selected) return;
    const candidate = { ...selected, is_draft: draft };
    const found = caseErrors(candidate);
    setErrors(found);
    if (Object.keys(found).length) { setMessage("Complete the highlighted fields."); requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus()); return; }
    start(async () => {
      const result = await saveCase(candidate);
      setMessage(result.message);
      if (result.errors) setErrors(result.errors);
      if (result.ok) { setSelected(null); router.refresh(); }
    });
  }
  function changeStatus(row: CaseRecord, status: string) {
    if (status === row.status || !canManageMaintenance || row.is_draft || row.schema_version !== 2) return;
    const candidate = { ...row, status };
    const found = caseErrors(candidate);
    if (Object.keys(found).length) { setSelected(structuredClone(candidate)); setErrors(found); setMessage("Complete the highlighted fields to change status."); return; }
    start(async () => {
      const result = await saveCase(candidate);
      setMessage(result.message);
      if (result.ok) router.refresh();
      else { setSelected(structuredClone(candidate)); if (result.errors) setErrors(result.errors); }
    });
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{heading}</h1><div className="mt-2 text-sm text-slate-600">{historical ? "Completed repairs across your homes." : "Record and track repairs across the homes."}</div></div>{!historical && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={!homes.length} onClick={() => open(emptyCase("maintenance", filters.home || homes[0]?.id))}><Plus size={18} aria-hidden />Add issue</button>}</header>
    {message && !selected && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">{message}</div>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(16,43,55,0.035)]">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm"><caption className="sr-only">Maintenance issues. Filter records from each column heading.</caption>
        <thead className="bg-white text-[#102c39]"><tr>
          <th scope="col" className="p-3"><ColumnFilter label="Reference" value={filters.reference} onChange={value => setFilter("reference", value)} /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Home" value={filters.home} onChange={value => setFilter("home", value)} options={homes.map(h => ({ value: h.id, label: h.name }))} /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Issue" value={filters.issue} onChange={value => setFilter("issue", value)} /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Category" value={filters.category} onChange={value => setFilter("category", value)} options={[...new Set([...maintenanceCategories, ...records.map(r => r.data.category).filter(Boolean)])].map(x => ({ value: x, label: x }))} /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Priority" value={filters.priority} onChange={value => setFilter("priority", value)} options={priorityOptions.map(x => ({ value: x, label: x }))} /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Reported" value={filters.reported} onChange={value => setFilter("reported", value)} type="date" /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Target" value={filters.target} onChange={value => setFilter("target", value)} type="date" /></th>
          <th scope="col" className="p-3"><ColumnFilter label="Status" value={filters.status} onChange={value => setFilter("status", value)} options={["Draft", ...caseStates.maintenance].map(x => ({ value: x, label: x }))} /></th>
          <th scope="col" className="p-3 font-semibold">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{shown.map(row => <tr key={row.id} className="hover:bg-slate-50">
          <td className="whitespace-nowrap p-3 text-xs text-slate-600" title={row.reference}>{row.reference ?? "—"}</td>
          <td className="p-3 font-medium">{homeName(homes, row.home_id)}</td>
          <td className="max-w-72 p-3"><div className="font-medium text-[#102c39]">{row.title || "Untitled draft"}</div><div className="mt-1 line-clamp-2 text-xs text-slate-600">{row.data.location || row.data.description}</div></td>
          <td className="p-3">{row.data.category || "—"}</td>
          <td className="p-3">{priorityBadge(row.data.priority)}</td>
          <td className="whitespace-nowrap p-3">{row.occurred_on || "—"}</td>
          <td className="whitespace-nowrap p-3">{row.data.due_on || "—"}</td>
          <td className="p-3">{canManageMaintenance && !row.is_draft && row.schema_version === 2
            ? <MaintenanceSelectControl id={`status-${row.id}`} ariaLabel={`Change status for ${row.title || "issue"}`} value={row.status}
                options={caseStates.maintenance.map(status => ({ value: status, label: status }))} disabled={pending}
                onChange={status => changeStatus(row, status)} className={`min-w-36 text-xs font-semibold ${statusTone(row.status)}`} />
            : badge(row.status, row.is_draft)}</td>
          <td className="p-3"><button type="button" className={actionClass} title={row.status === "Completed" ? "View completed issue" : "Open issue"} aria-label={`${row.status === "Completed" ? "View completed" : "Open"} ${row.title || "issue"}`} onClick={() => open(row)}>{row.status === "Completed" && !row.is_draft ? <Check size={19} aria-hidden /> : <Plus size={19} aria-hidden />}</button></td>
        </tr>)}</tbody>
      </table>{!shown.length && <div className="p-8 text-center text-sm text-slate-600">{historical ? "No completed issues match these filters." : "No issues match these filters."}</div>}
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={value => { if (!value && !pending) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle className="text-xl">{selected?.version ? "Issue details" : "Add issue"}</DialogTitle><DialogDescription asChild><div>Dates use Europe/London. Required fields are checked when registering.</div></DialogDescription></DialogHeader>
      {selected && data && <div className="space-y-5"><fieldset disabled={pending || readonly} className="grid gap-4 sm:grid-cols-2">
        <MaintenanceSelectField name="maintenance_home" label="Home" value={selected.home_id} disabled={pending || readonly || Boolean(selected.version)} options={homes.map(h => ({ value: h.id, label: h.name }))} onChange={value => setSelected({ ...selected, home_id: value })} />
        <CaptureField name="maintenance_date" label="Date reported" value={selected.occurred_on} type="date" error={errors.occurred_on} onChange={setReportedOn} />
        <CaptureField name="maintenance_title" label="Issue title" value={selected.title} error={errors.title} onChange={value => setSelected({ ...selected, title: value })} />
        <MaintenanceChoiceField name="maintenance_location" label="Location" value={data.location} values={locationChoices} disabled={pending || readonly} error={errors.location} onChange={value => setData("location", value)} />
        <MaintenanceSelectField name="maintenance_category" label="Category" value={data.category} options={maintenanceCategories} disabled={pending || readonly} error={errors.category} onChange={value => setData("category", value)} />
        {data.category === "Other" && <CaptureField name="maintenance_category_other" label="Describe category" value={data.category_other} error={errors.category_other} onChange={value => setData("category_other", value)} />}
        <div><MaintenanceSelectField name="maintenance_priority" label="Priority" value={data.priority} options={priorityOptions} disabled={pending || readonly} error={errors.priority} onChange={setPriority} /><div className="mt-1 text-xs text-slate-600">Urgent is for an immediate threat to life. Target dates are suggested and can be changed.</div></div>
        <CaptureField name="maintenance_description" label="Description" value={data.description} error={errors.description} multiline onChange={value => setData("description", value)} />
        {data.priority === "Urgent" && <CaptureField name="maintenance_critical_action" label="Immediate action to keep people safe" value={data.critical_action} error={errors.critical_action} multiline onChange={value => setData("critical_action", value)} />}
        <MaintenanceChoiceField name="maintenance_owner" label="Responsible person" value={data.owner} values={ownerChoices} disabled={pending || readonly} error={errors.owner} onChange={value => setData("owner", value)} />
        <MaintenanceChoiceField name="maintenance_provider" label="Provider / executor" value={data.provider} values={providerChoices} disabled={pending || readonly} onChange={value => setData("provider", value)} />
        <div><CaptureField name="maintenance_target" label="Target date" value={data.due_on} type="date" error={errors.due_on} onChange={value => setData("due_on", value)} />{data.priority && <div className="mt-1 text-xs text-slate-600">Suggested: {maintenanceTargets[data.priority] === 0 ? "same day" : `${maintenanceTargets[data.priority]} days`} from the report date.</div>}</div>
        <CaptureField name="maintenance_started" label="Date started" value={data.started_on} type="date" error={errors.started_on} onChange={value => setData("started_on", value)} />
        <MaintenanceSelectField name="maintenance_status" label="Status" value={selected.status} options={caseStates.maintenance} disabled={pending || readonly || !canManageMaintenance} error={errors.status} className={statusTone(selected.status)} onChange={value => setSelected({ ...selected, status: value })} />
        {selected.status === "Completed" && <><CaptureField name="maintenance_completed" label="Completion date" value={data.closed_on} type="date" error={errors.closed_on} onChange={value => setData("closed_on", value)} /><CaptureField name="maintenance_resolution" label="Resolution" value={data.resolution} multiline error={errors.resolution} onChange={value => setData("resolution", value)} /></>}
      </fieldset>
        {readonly && <div className="text-sm text-slate-600">{legacyRecord ? "This record is preserved in its original format." : "Only the maintenance lead or director can manage this issue."}</div>}
        {!!selected.history?.length && <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-medium">Status history</summary><ul className="mt-2 space-y-1 text-xs text-slate-600">{[...selected.history].sort((a,b) => b.version-a.version).map(entry => <li key={entry.id}>{entry.from_status || "New"} → {entry.to_status} · {new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",dateStyle:"medium"}).format(new Date(entry.changed_at))}</li>)}</ul></details>}
        {message && <div role="status" className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-amber-950">{message}</div>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setSelected(null)} disabled={pending}>Close</button>{!readonly && <>{(!selected.version || selected.is_draft) && <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" disabled={pending} onClick={() => persist(true)}>Save draft</button>}<button type="button" className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={pending} onClick={() => persist(false)}>{pending ? "Saving…" : selected.version ? "Save issue" : "Register issue"}</button></>}</div>
      </div>}
    </DialogContent></Dialog>
  </div>;
}

export function MaintenanceOverview({ homes, records }: Pick<Props, "homes" | "records">) {
  const today = londonToday();
  const month = today.slice(0, 7);
  const registered = records.filter(row => !row.is_draft);
  const open = registered.filter(row => openStates.includes(row.status));
  const overdue = open.filter(row => row.data.due_on && row.data.due_on < today);
  const completedMonth = registered.filter(row => row.status === "Completed" && row.data.closed_on?.startsWith(month));
  const high = open.filter(row => ["High", "Urgent"].includes(row.data.priority));
  const summary = [
    { label: "Open issues", value: open.length, accent: "text-teal-800", href: "/maintenance?focus=open" },
    { label: "Overdue", value: overdue.length, accent: "text-rose-700", href: "/maintenance?focus=overdue" },
    { label: "High / urgent", value: high.length, accent: "text-amber-700", href: "/maintenance?focus=high" },
    { label: "Completed this month", value: completedMonth.length, accent: "text-emerald-700", href: "/maintenance/historical?focus=completed-month" },
  ];
  const areaCounts = new Map<string, number>();
  for (const row of open) {
    const area = row.data.location?.trim() || "Unspecified";
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }
  const areas = [...areaCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const areaColors = ["bg-teal-600", "bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500"];
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-semibold tracking-tight">Overview</h1><div className="mt-2 text-sm text-slate-600">Maintenance workload across your homes.</div></header>
    <section aria-label="Maintenance totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summary.map(item => <Link key={item.label} href={item.href} className="workspace-kpi-link flex min-h-36 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center">
        <div className="text-sm font-medium text-[#102c39]">{item.label}</div>
        <strong className={`mt-3 block text-4xl font-semibold ${item.accent}`}>{item.value}</strong>
      </Link>)}
    </section>
    <MaintenanceSafetySummary homes={homes} />
    <MaintenanceTimeline records={registered} today={today} />
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4"><Wrench size={18} className="text-teal-700" aria-hidden /><h2 className="text-lg font-semibold">By home</h2></div>
        <div><table className="w-full table-fixed text-left text-sm">
          <thead><tr><th className="w-1/3 px-5 py-3">Home</th><th className="px-2 py-3">Open</th><th className="px-2 py-3">Overdue</th><th className="px-2 py-3">High / urgent</th><th className="px-2 py-3">Completed this month</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{homes.map(home => <tr key={home.id}>
            <td className="px-5 py-3 font-medium">{home.name}</td>
            <td className="px-2 py-3">{open.filter(row => row.home_id === home.id).length}</td>
            <td className="px-2 py-3">{overdue.filter(row => row.home_id === home.id).length}</td>
            <td className="px-2 py-3">{high.filter(row => row.home_id === home.id).length}</td>
            <td className="px-2 py-3">{completedMonth.filter(row => row.home_id === home.id).length}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">By area</h2>
        <div className="mt-1 text-sm text-slate-600">Open issues by location</div>
        <div className="mt-5 space-y-4">{areas.map(([area, count], index) => <div key={area}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm"><strong className="font-medium text-[#102c39]">{area}</strong><strong className="text-[#102c39]">{count}</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`workspace-measure-fill h-full rounded-full ${areaColors[index % areaColors.length]}`} style={{ width: `${Math.max(8, count / Math.max(open.length, 1) * 100)}%` }} /></div>
        </div>)}
        {!areas.length && <div className="py-6 text-sm text-slate-600">No open issues.</div>}</div>
      </section>
    </div>
  </div>;
}

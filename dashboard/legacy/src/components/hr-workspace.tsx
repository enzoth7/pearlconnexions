"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, CalendarClock, CheckCircle2, GraduationCap, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { HrFilterHeader } from "@/components/hr-register-controls";
import { HrCoverageAlerts } from "@/components/hr-coverage-alerts";
import { supabase } from "../../../src/shims/supabase";

type Employee = {
  id: string; name: string; role_title: string; home_id: string | null; manager_id: string | null;
  contract_type: string; employment_status: string; start_on: string | null; dbs_expires_on: string | null;
  right_to_work_expires_on: string | null; first_aid_expires_on: string | null;
  safeguarding_expires_on: string | null; manual_handling_expires_on: string | null;
  supervision_due_on: string | null; probation_due_on: string | null;
  induction_complete: boolean | null; version: number; removed_at: string | null;
  medication_competency_required: boolean | null; medication_competency_expires_on: string | null;
};
type Manager = { id: string; name: string; role_title: string | null; source_code: string };
type Home = { id: string; name: string };
type Row = { key: string; employee?: Employee; name: string; role: string; home: string; manager: string; contract: string; status: string;
  start: string; dbs: string; right: string; first: string; safeguarding: string; handling: string; induction: string; supervision: string; probation: string; medication: string; medication_required: string };
type Field = keyof Omit<Row, "key" | "employee">;
const columns: { key: Field; title: string; kind?: "date" | "choice" }[] = [
  { key: "name", title: "Employee" }, { key: "role", title: "Role" }, { key: "home", title: "Home", kind: "choice" },
  { key: "manager", title: "Manager", kind: "choice" }, { key: "contract", title: "Contract", kind: "choice" },
  { key: "status", title: "Status", kind: "choice" }, { key: "start", title: "Start date", kind: "date" },
  { key: "dbs", title: "DBS expiry", kind: "date" }, { key: "right", title: "Right to Work", kind: "date" },
  { key: "first", title: "First Aid", kind: "date" }, { key: "safeguarding", title: "Safeguarding", kind: "date" },
  { key: "handling", title: "Manual Handling", kind: "date" }, { key: "induction", title: "Induction", kind: "choice" },
  { key: "supervision", title: "Supervision due", kind: "date" }, { key: "probation", title: "Probation due", kind: "date" },
  { key: "medication_required", title: "Medication competency required", kind: "choice" }, { key: "medication", title: "Medication competency expiry", kind: "date" },
];
const detailTabs: { value: string; label: string; keys: Field[] }[] = [
  { value: "details", label: "Details", keys: ["role", "home", "manager", "contract", "status", "start"] },
  { value: "follow-up", label: "Follow-up", keys: ["induction", "dbs", "right", "first", "safeguarding", "handling", "medication_required", "medication", "supervision", "probation"] },
];
const compactColumnKeys: Field[] = ["name", "role", "home", "contract", "status", "start", "dbs"];
const compactColumns = columns.filter(column => compactColumnKeys.includes(column.key));
const columnVisibility: Partial<Record<Field, string>> = {
  role: "hidden md:table-cell", home: "hidden sm:table-cell", contract: "hidden lg:table-cell",
  start: "hidden xl:table-cell", dbs: "hidden 2xl:table-cell",
};
const contracts = ["Full time", "Part time", "Bank", "Agency", "Fixed term"];
const statuses = ["Active", "Onboarding", "On leave", "Suspended", "Left"];
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#102c39] focus-visible:outline-2 focus-visible:outline-teal-700";
const blank = { name: "", role_title: "", home_id: "", manager_id: "", contract_type: "Full time", employment_status: "Active",
  start_on: "", dbs_expires_on: "", right_to_work_expires_on: "", first_aid_expires_on: "", safeguarding_expires_on: "",
  manual_handling_expires_on: "", supervision_due_on: "", probation_due_on: "", induction_complete: "unknown", medication_competency_required: "unknown", medication_competency_expires_on: "" };
type Form = typeof blank;

function tone(status: string) {
  return status === "Active" ? "bg-emerald-100 text-emerald-900" : status === "Onboarding" ? "bg-sky-100 text-sky-900"
    : status === "On leave" ? "bg-violet-100 text-violet-900" : status === "Suspended" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
}
function inductionTone(status: string) {
  return status === "Complete" ? "bg-emerald-100 text-emerald-900" : status === "Incomplete" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
}
function displayDate(value: string) {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function fromEmployee(row: Employee): Form {
  return { name: row.name, role_title: row.role_title, home_id: row.home_id ?? "", manager_id: row.manager_id ?? "",
    contract_type: row.contract_type, employment_status: row.employment_status, start_on: row.start_on ?? "",
    dbs_expires_on: row.dbs_expires_on ?? "", right_to_work_expires_on: row.right_to_work_expires_on ?? "",
    first_aid_expires_on: row.first_aid_expires_on ?? "", safeguarding_expires_on: row.safeguarding_expires_on ?? "",
    manual_handling_expires_on: row.manual_handling_expires_on ?? "", supervision_due_on: row.supervision_due_on ?? "",
    probation_due_on: row.probation_due_on ?? "", induction_complete: row.induction_complete === null ? "unknown" : String(row.induction_complete),
    medication_competency_required: row.medication_competency_required == null ? "unknown" : String(row.medication_competency_required), medication_competency_expires_on: row.medication_competency_expires_on ?? "" };
}
function payload(form: Form) {
  return { ...form, name: form.name.trim(), role_title: form.role_title.trim(), home_id: form.home_id || null,
    manager_id: form.manager_id || null, start_on: form.start_on || null, dbs_expires_on: form.dbs_expires_on || null,
    right_to_work_expires_on: form.right_to_work_expires_on || null, first_aid_expires_on: form.first_aid_expires_on || null,
    safeguarding_expires_on: form.safeguarding_expires_on || null, manual_handling_expires_on: form.manual_handling_expires_on || null,
    supervision_due_on: form.supervision_due_on || null, probation_due_on: form.probation_due_on || null,
    induction_complete: form.induction_complete === "unknown" ? null : form.induction_complete === "true",
    medication_competency_required: form.medication_competency_required === "unknown" ? null : form.medication_competency_required === "true",
    medication_competency_expires_on: form.medication_competency_required === "true" ? form.medication_competency_expires_on || null : null };
}
function FilterHeader({ column, value, values, onChange }: { column: typeof columns[number]; value: string; values: string[]; onChange: (value: string) => void }) {
  return <HrFilterHeader id={`hr-filter-${column.key}`} label={column.title} value={value} options={column.kind === "choice" ? values.filter(Boolean) : undefined} type={column.kind === "date" ? "date" : "text"} dark onChange={onChange} />;
}

export function HrWorkspace({ mode, canEdit, managerId = null }: { mode: "overview" | "employees"; canEdit: boolean; managerId?: string | null }) {
  const focus = useSearchParams().get("focus");
  const focusedTitle = focus === "active" ? "Active employees" : focus === "training" ? "Training current" : focus === "onboarding" ? "Onboarding" : focus === "supervision" ? "Supervisions due" : "Employees";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [removing, setRemoving] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [staff, leads, houses] = await Promise.all([
      supabase.from("hr_employees").select("*").is("removed_at", null).order("name"),
      supabase.from("managers").select("id,name,role_title,source_code").order("name"),
      supabase.from("qa_homes").select("id,name").eq("active", true).order("name"),
    ]);
    setEmployees((staff.data ?? []) as Employee[]);
    setManagers(((leads.data ?? []) as Manager[]).filter(item => item.name !== "Test User"));
    setHomes((houses.data ?? []) as Home[]);
    setError(staff.error?.message ?? leads.error?.message ?? houses.error?.message ?? "");
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const homeName = (id: string | null) => homes.find(home => home.id === id)?.name ?? "";
  const managerName = (id: string | null) => managers.find(manager => manager.id === id)?.name ?? "";
  const rows: Row[] = employees.map(person => ({ key: person.id, employee: person, name: person.name, role: person.role_title, home: homeName(person.home_id), manager: managerName(person.manager_id), contract: person.contract_type,
      status: person.employment_status, start: person.start_on ?? "", dbs: person.dbs_expires_on ?? "", right: person.right_to_work_expires_on ?? "",
      first: person.first_aid_expires_on ?? "", safeguarding: person.safeguarding_expires_on ?? "", handling: person.manual_handling_expires_on ?? "",
      induction: person.induction_complete === null ? "Pending" : person.induction_complete ? "Complete" : "Incomplete",
      supervision: person.supervision_due_on ?? "", probation: person.probation_due_on ?? "",
      medication_required: person.medication_competency_required == null ? "Pending" : person.medication_competency_required ? "Yes" : "No", medication: person.medication_competency_expires_on ?? "" }));
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const soon = new Date(`${now}T12:00:00Z`); soon.setUTCDate(soon.getUTCDate() + 60);
  const due = soon.toISOString().slice(0, 10);
  const active = employees.filter(row => row.employment_status === "Active");
  const dbsDue = active.filter(row => row.dbs_expires_on && row.dbs_expires_on <= due).length;
  const supervisionDue = active.filter(row => row.supervision_due_on && row.supervision_due_on <= now).length;
  const certificates = (row: Employee) => [row.first_aid_expires_on, row.safeguarding_expires_on, row.manual_handling_expires_on];
  const currentCertificates = active.filter(row => certificates(row).every(date => date && date >= now) && row.induction_complete === true).length;
  const trainingRate = active.length ? Math.round(currentCertificates / active.length * 100) : null;
  const onboarding = employees.filter(row => row.employment_status === "Onboarding").length;
  const visible = rows.filter(row => {
    const person = row.employee;
    if (focus === "active" && row.status !== "Active") return false;
    if (focus === "onboarding" && row.status !== "Onboarding") return false;
    if (focus === "training" && (!person || person.employment_status !== "Active" || !certificates(person).every(date => date && date >= now) || person.induction_complete !== true)) return false;
    if (focus === "supervision" && (!person || person.employment_status !== "Active" || !person.supervision_due_on || person.supervision_due_on > now)) return false;
    return columns.every(column => !filters[column.key] || (column.kind === "choice" ? row[column.key] === filters[column.key] : row[column.key].toLowerCase().includes(filters[column.key].toLowerCase())));
  });
  const inThirtyDays = new Date(`${now}T12:00:00Z`); inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);
  const trainingDue = active.filter(row => certificates(row).some(date => date && date <= inThirtyDays.toISOString().slice(0, 10))).length;
  const medicationDue = active.filter(row => row.medication_competency_required === true && (!row.medication_competency_expires_on || row.medication_competency_expires_on <= inThirtyDays.toISOString().slice(0, 10))).length;
  const medicationPending = active.filter(row => row.medication_competency_required == null).length;
  const probationDue = employees.filter(row => row.probation_due_on?.startsWith(now.slice(0, 7))).length;
  const summary = [
    { label: "Active employees", value: active.length, note: `${active.length} of ${employees.length} records active`, icon: UsersRound, color: "#176b93", progress: employees.length ? active.length / employees.length * 100 : 0, href: "/hr/employees?focus=active" },
    { label: "Training current", value: trainingRate === null ? "—" : `${trainingRate}%`, note: "Core certificates and induction", icon: GraduationCap, color: "#087e65", progress: trainingRate ?? 0, href: "/hr/employees?focus=training" },
    { label: "Onboarding", value: onboarding, note: "Employees in induction", icon: BriefcaseBusiness, color: "#a15d18", progress: employees.length ? onboarding / employees.length * 100 : 0, href: "/hr/employees?focus=onboarding" },
    { label: "Supervisions due", value: supervisionDue, note: "Target date reached", icon: CalendarClock, color: "#7053a0", progress: active.length ? supervisionDue / active.length * 100 : 0, href: "/hr/employees?focus=supervision" },
  ];
  const contractColors = ["#176b93", "#087e65", "#a15d18", "#7053a0", "#ac4545"];
  const contractCounts = [...new Set(employees.map(row => row.contract_type || "Unspecified"))]
    .map(label => ({ label, count: employees.filter(row => (row.contract_type || "Unspecified") === label).length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  let contractStart = 0;
  const contractGradient = contractCounts.map((item, index) => {
    const start = contractStart;
    contractStart += item.count / employees.length * 100;
    return `${contractColors[index % contractColors.length]} ${start}% ${contractStart}%`;
  }).join(", ");
  function open(person?: Employee) { setForm(person ? fromEmployee(person) : { ...blank, manager_id: managerId ?? "" }); setEditing(person ?? "new"); setError(""); }
  async function save() {
    if (!form.name.trim() || !form.role_title.trim()) { setError("Enter an employee name and role."); return; }
    setBusy(true);
    const values = payload(form);
    const result = editing !== "new" && editing ? await supabase.from("hr_employees").update({ ...values, version: editing.version + 1 }).eq("id", editing.id).eq("version", editing.version).select().maybeSingle()
      : await supabase.from("hr_employees").insert(values).select().maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This record changed. Reload and try again."); return; }
    setEditing(null); setError(""); await load();
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    const result = await supabase.from("hr_employees").update({ removed_at: new Date().toISOString(), version: removing.version + 1 }).eq("id", removing.id).eq("version", removing.version).select().maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This record changed. Reload and try again."); return; }
    setRemoving(null); setError(""); await load();
  }
  const dateFields: { key: keyof Form; label: string }[] = [
    { key: "start_on", label: "Start date" }, { key: "dbs_expires_on", label: "DBS expiry" }, { key: "right_to_work_expires_on", label: "Right to Work expiry" },
    { key: "first_aid_expires_on", label: "First Aid expiry" }, { key: "safeguarding_expires_on", label: "Safeguarding expiry" },
    { key: "manual_handling_expires_on", label: "Manual Handling expiry" }, { key: "supervision_due_on", label: "Supervision due" }, { key: "probation_due_on", label: "Probation due" },
  ];
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className={mode === "overview" ? "text-4xl font-bold tracking-tight text-[#102c39] sm:text-5xl" : "text-3xl font-semibold text-[#102c39]"}>{mode === "overview" ? "Human Resources overview" : focusedTitle}</h1>{mode === "employees" && <div className="mt-2 text-sm text-slate-600">Staff records across homes and teams.</div>}</div>
      {mode === "employees" && canEdit && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white" onClick={() => open()}><Plus size={18} aria-hidden />Add employee</button>}</header>
    {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6">Loading employees…</div> : error && !editing && !removing ? <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 text-red-800">{error}</div> : mode === "overview" ? <>
      <section aria-labelledby="hr-kpis"><h2 id="hr-kpis" className="mb-3 text-base font-extrabold uppercase tracking-[.12em] text-[#102c39]">Snapshot</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map(item => <Link key={item.label} href={item.href} className="workspace-kpi-link flex min-h-40 flex-col rounded-2xl border border-[#c8d8e7] bg-white p-5">
          <div className="flex items-start justify-between gap-2"><div className="text-sm font-medium text-[#28496b]">{item.label}</div><item.icon size={20} style={{ color: item.color }} aria-hidden /></div>
          <strong className="mt-3 text-3xl font-semibold tracking-tight text-[#102c39]">{item.value}</strong>
          <div className="metric-segments mt-2 w-full" aria-hidden="true"><i style={{ width: `${item.progress}%`, backgroundColor: item.color }} /></div>
          <div className="mt-auto pt-3 text-sm text-[#28496b]">{item.note}</div>
        </Link>)}</div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-[#dce5e2] bg-white shadow-sm"><div className="border-b border-[#c8d8e7] px-6 py-6"><h2 className="flex items-center gap-3 text-xl font-bold text-[#102c39]"><UsersRound size={23} className="text-blue-700" aria-hidden />Register</h2><div className="mt-2 text-base text-[#28496b]">Staff records across homes and teams.</div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-base"><thead className="border-b border-[#c8d8e7] bg-[#f7f9fa] text-[#28496b]"><tr><th scope="col" className="px-6 py-3">Employee</th><th scope="col" className="px-4 py-3">Role</th><th scope="col" className="px-4 py-3">Service</th><th scope="col" className="px-4 py-3">Contract</th><th scope="col" className="px-4 py-3">Start date</th><th scope="col" className="min-w-48 px-4 py-3">Training</th><th scope="col" className="px-4 py-3">Supervision due</th><th scope="col" className="px-4 py-3">DBS renewal</th><th scope="col" className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-[#c8d8e7] text-[#203247]">{rows.map(row => {
            const training = row.employee ? [row.employee.induction_complete === true, ...certificates(row.employee).map(date => Boolean(date && date >= now))] : null;
            const trainingPercent = training ? Math.round(training.filter(Boolean).length / training.length * 100) : null;
            return <tr key={row.key}><td className="px-6 py-2 font-bold text-[#28496b]">{row.name}</td><td className="px-4 py-2">{row.role}</td><td className="px-4 py-2">{row.home || "—"}</td><td className="px-4 py-2">{row.contract || "—"}</td><td className="whitespace-nowrap px-4 py-2">{displayDate(row.start)}</td><td className="px-4 py-2">{trainingPercent === null ? "—" : <div className="flex items-center gap-2"><div className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${trainingPercent}%` }} /></div><strong className="text-sm tabular-nums text-[#28496b]">{trainingPercent}%</strong></div>}</td><td className="whitespace-nowrap px-4 py-2">{displayDate(row.supervision)}</td><td className="whitespace-nowrap px-4 py-2">{displayDate(row.dbs)}</td><td className="px-4 py-2">{row.status ? <strong className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${tone(row.status)}`}>{row.status}</strong> : "—"}</td></tr>;
          })}</tbody>
        </table></div><div className="border-t border-[#c8d8e7] px-6 py-2"><Link href="/hr/employees" className="inline-flex min-h-11 items-center font-medium text-teal-800 underline">View full register</Link></div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-3xl border border-[#dce5e2] bg-white shadow-sm"><div className="border-b border-[#c8d8e7] px-6 py-6"><h2 className="flex items-center gap-3 text-xl font-bold text-[#102c39]"><BriefcaseBusiness size={23} className="text-blue-700" aria-hidden />Employees by contract</h2><div className="mt-2 text-base text-[#28496b]">Distribution across the employee register.</div></div>
          <div className="flex flex-col items-center gap-6 px-6 py-6 2xl:flex-row"><div role="img" aria-label={contractCounts.length ? `Contract types: ${contractCounts.map(item => `${item.label} ${item.count}`).join(", ")}` : "No employee contracts recorded"} className="relative size-44 shrink-0 rounded-full" style={{ background: contractCounts.length ? `conic-gradient(${contractGradient})` : "#e3eae7" }}><div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-[#102c39]"><strong className="text-3xl tabular-nums">{employees.length}</strong><div className="text-xs">employees</div></div></div>
            <div className="w-full space-y-3">{contractCounts.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-3 text-sm text-[#28496b]"><div className="flex min-w-0 items-center gap-2"><div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: contractColors[index % contractColors.length] }} aria-hidden="true" /><div className="break-words">{item.label}</div></div><strong className="shrink-0 tabular-nums text-[#102c39]">{item.count} · {Math.round(item.count / employees.length * 100)}%</strong></div>)}{!contractCounts.length && <div className="text-sm text-slate-600">No contracts recorded.</div>}</div>
          </div>
        </section>
        <section className="overflow-hidden rounded-3xl border border-[#dce5e2] bg-white shadow-sm"><div className="border-b border-[#c8d8e7] px-6 py-6"><h2 className="flex items-center gap-3 text-xl font-bold text-[#102c39]"><CheckCircle2 size={23} className="text-emerald-700" aria-hidden />People actions</h2><div className="mt-2 text-base text-[#28496b]">Items requiring HR follow-up.</div></div>
          <div className="divide-y divide-[#c8d8e7] px-6 py-5">{[
            { label: "Training certificates due within 30 days", count: trainingDue, color: "bg-amber-100 text-amber-900" },
            { label: "Medication competency due or missing", count: medicationDue, color: "bg-rose-100 text-rose-900" },
            { label: "Medication requirement pending", count: medicationPending, color: "bg-amber-100 text-amber-900" },
            { label: "DBS renewals within 60 days", count: dbsDue, color: "bg-amber-100 text-amber-900" },
            { label: "Probation reviews this month", count: probationDue, color: "bg-sky-100 text-sky-900" },
            { label: "Supervisions due", count: supervisionDue, color: "bg-rose-100 text-rose-900" },
          ].map(item => <div key={item.label} className="flex min-h-15 items-center justify-between gap-4 py-3 text-base"><div className="text-[#28496b]">{item.label}</div><strong className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${item.color}`}>{item.count} {item.count === 1 ? "person" : "people"}</strong></div>)}</div>
        </section>
      </div>
      <HrCoverageAlerts />
    </> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm"><caption className="sr-only">HR employee register with filters in column headings and more details for each employee</caption>
      <thead className="bg-white"><tr>{compactColumns.map(column => <th key={column.key} scope="col" className={`min-w-0 px-2 py-2 sm:px-3 ${columnVisibility[column.key] ?? ""}`}><FilterHeader column={column} value={filters[column.key] ?? ""} values={[...new Set(rows.map(row => row[column.key]))].sort()} onChange={value => setFilters(current => ({ ...current, [column.key]: value }))} /></th>)}<th scope="col" className="w-14 px-2 py-2"><div className="sr-only">Details</div></th></tr></thead>
      <tbody className="divide-y divide-slate-100">{visible.map(row => <tr key={row.key} className="align-middle">{compactColumns.map(column => <td key={column.key} className={`min-w-0 break-words px-2 py-2.5 sm:px-3 ${columnVisibility[column.key] ?? ""}`}>{column.key === "status" && row.status ? <strong className={`inline-block rounded-lg px-2 py-1 text-xs ${tone(row.status)}`}>{row.status}</strong> : column.kind === "date" ? displayDate(row[column.key]) : row[column.key] || "—"}</td>)}<td className="px-2 py-2"><button type="button" aria-label={`Show details for ${row.name}`} title="Show details" className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700" onClick={() => setDetails(row)}><Plus size={18} aria-hidden /></button></td></tr>)}</tbody>
    </table>{!visible.length && <div className="p-8 text-center text-sm text-slate-600">No employees match these filters.</div>}</div>}
    <Dialog open={Boolean(details)} onOpenChange={value => { if (!value) setDetails(null); }}><DialogContent><DialogHeader><DialogTitle>{details?.name ?? "Employee details"}</DialogTitle><div className="text-sm text-slate-600">{details?.role}</div></DialogHeader>
      {details && <Tabs key={details.key} defaultValue="details" className="gap-0"><TabsList aria-label="Employee detail views" className="w-full justify-start gap-2 rounded-none bg-white p-0">
        {detailTabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="flex-none rounded-xl border border-[#b9d2d5] bg-white px-5 py-2.5 text-[#102c39] shadow-none hover:bg-[#e8f7f2] data-[state=active]:border-[#102c39] data-[state=active]:bg-[#102c39] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:hover:bg-[#102c39]">{tab.label}</TabsTrigger>)}
      </TabsList>{detailTabs.map(tab => <TabsContent key={tab.value} value={tab.value} className="mt-5"><dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{tab.keys.map(key => { const column = columns.find(item => item.key === key)!; return <div key={key} className="min-w-0 border-b border-slate-200 pb-2"><dt className="text-xs font-semibold text-slate-500">{column.title}</dt><dd className="mt-1 break-words text-sm font-medium text-[#102c39]">{key === "status" && details.status ? <strong className={`inline-block rounded-lg px-2 py-1 text-xs ${tone(details.status)}`}>{details.status}</strong> : key === "induction" ? <strong className={`inline-block rounded-lg px-2 py-1 text-xs ${inductionTone(details.induction)}`}>{details.induction}</strong> : column.kind === "date" ? displayDate(details[key]) : details[key] || "—"}</dd></div>; })}</dl></TabsContent>)}</Tabs>}
      {details?.employee && canEdit && (!managerId || details.employee.manager_id === managerId) && <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" aria-label={`Edit ${details.name}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-teal-800" onClick={() => { const person = details.employee; setDetails(null); if (person) open(person); }}><Pencil size={17} aria-hidden />Edit</button><button type="button" aria-label={`Remove ${details.name}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-rose-700" onClick={() => { setRemoving(details.employee ?? null); setDetails(null); }}><Trash2 size={17} aria-hidden />Remove</button></div>}
    </DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={value => { if (!value && !busy) { setEditing(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Add employee" : "Employee details"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Employee name<input className={fieldClass} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={120} /></label><label className="text-sm font-medium">Role<input className={fieldClass} value={form.role_title} onChange={event => setForm(current => ({ ...current, role_title: event.target.value }))} maxLength={120} /></label>
        <MaintenanceSelectField name="hr_home" label="Home" value={form.home_id || "__none__"} options={[{ value: "__none__", label: "No assigned home" }, ...homes.map(home => ({ value: home.id, label: home.name }))]} onChange={value => setForm(current => ({ ...current, home_id: value === "__none__" ? "" : value }))} />
        <MaintenanceSelectField name="hr_manager" label="Manager" value={form.manager_id || "__none__"} options={[{ value: "__none__", label: "Not assigned" }, ...managers.map(manager => ({ value: manager.id, label: manager.name }))]} onChange={value => setForm(current => ({ ...current, manager_id: value === "__none__" ? "" : value }))} disabled={Boolean(managerId)} />
        <MaintenanceSelectField name="hr_contract" label="Contract" value={form.contract_type} options={contracts} onChange={value => setForm(current => ({ ...current, contract_type: value }))} />
        <MaintenanceSelectField name="hr_status" label="Status" value={form.employment_status} options={statuses} onChange={value => setForm(current => ({ ...current, employment_status: value }))} />
        {dateFields.map(field => <label key={field.key} className="text-sm font-medium">{field.label}<input type="date" className={fieldClass} value={form[field.key]} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} /></label>)}
        <MaintenanceSelectField name="hr_induction" label="Induction" value={form.induction_complete} options={[{ value: "unknown", label: "Pending" }, { value: "true", label: "Complete" }, { value: "false", label: "Incomplete" }]} onChange={value => setForm(current => ({ ...current, induction_complete: value }))} />
        <MaintenanceSelectField name="hr_medication_required" label="Medication competency required" value={form.medication_competency_required} options={[{ value: "unknown", label: "Pending" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]} onChange={value => setForm(current => ({ ...current, medication_competency_required: value }))} />
        {form.medication_competency_required === "true" && <label className="text-sm font-medium">Medication competency expiry<input type="date" className={fieldClass} value={form.medication_competency_expires_on} onChange={event => setForm(current => ({ ...current, medication_competency_expires_on: event.target.value }))} /></label>}
      </div>{error && <div role="alert" className="mt-4 text-sm text-red-800">{error}</div>}
      <div className="mt-5 flex justify-end gap-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save employee"}</button></div>
    </DialogContent></Dialog>
    <Dialog open={Boolean(removing)} onOpenChange={value => { if (!value && !busy) { setRemoving(null); setError(""); } }}><DialogContent><DialogHeader><DialogTitle>Remove employee</DialogTitle></DialogHeader><div>Remove {removing?.name} from the register?</div>{error && <div role="alert" className="text-sm text-red-800">{error}</div>}<div className="mt-5 flex justify-end gap-3"><button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4" onClick={() => setRemoving(null)}>Cancel</button><button type="button" className="min-h-11 rounded-xl bg-rose-700 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void remove()}>{busy ? "Removing…" : "Remove"}</button></div></DialogContent></Dialog>
  </div>;
}

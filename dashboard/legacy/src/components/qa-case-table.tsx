"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { HrFilterHeader } from "@/components/hr-register-controls";
import { caseStates, incidentCategories, londonToday, riskCategories, riskLevels, type CaseRecord, type Person } from "@/lib/qa-capture";
import type { Home } from "@/lib/types";

type Kind = "risks" | "incidents";
type Filters = { reference: string; title: string; home: string; person: string; category: string; priority: string; occurred: string; review: string; safeguarding: string; status: string };
const emptyFilters: Filters = { reference: "", title: "", home: "", person: "", category: "", priority: "", occurred: "", review: "", safeguarding: "", status: "" };

function severityTone(value: string) {
  if (value === "Low") return "bg-emerald-100 text-emerald-900";
  if (value === "Moderate") return "bg-yellow-100 text-yellow-900";
  if (value === "High") return "bg-red-100 text-red-900";
  if (["Critical", "Extremely high"].includes(value)) return "bg-red-200 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function statusTone(value: string, draft: boolean) {
  if (draft) return "bg-slate-100 text-slate-700";
  if (value === "Closed") return "bg-emerald-100 text-emerald-900";
  if (["Open", "Monitoring"].includes(value)) return "bg-sky-100 text-sky-900";
  if (value === "Follow up") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

function dateLabel(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year.slice(2)}` : value;
}

export function QaCaseTable({ kind, homes, records, people, onOpen, initialSafeguardingFilter = "" }: {
  kind: Kind; homes: Home[]; records: CaseRecord[]; people: Person[]; onOpen: (record: CaseRecord) => void; initialSafeguardingFilter?: string;
}) {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters, safeguarding: ["yes", "no", "pending"].includes(initialSafeguardingFilter) ? initialSafeguardingFilter : "" });
  useEffect(() => {
    setFilters(current => ({ ...current, safeguarding: ["yes", "no", "pending"].includes(initialSafeguardingFilter) ? initialSafeguardingFilter : "" }));
  }, [initialSafeguardingFilter]);
  const setFilter = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const personName = (row: CaseRecord) => (row.data.person_name ?? "").split(/\r?\n/).map(name => name.trim()).filter(Boolean).join(", ")
    || row.data.person_ids.map(id => people.find(person => person.id === id)?.alias ?? "Person").join(", ")
    || (row.data.involvement === "none" ? "None" : row.data.involvement === "unknown" && kind === "incidents" ? "Pending" : "—");
  const homeName = (row: CaseRecord) => homes.find(home => home.id === row.home_id)?.name ?? "—";
  const shown = records.filter(row => {
    const status = row.is_draft ? "Draft" : row.status;
    return (!filters.reference || (row.reference ?? "").toLowerCase().includes(filters.reference.toLowerCase()))
      && (!filters.title || `${row.title} ${row.data.description}`.toLowerCase().includes(filters.title.toLowerCase()))
      && (!filters.home || row.home_id === filters.home)
      && (!filters.person || personName(row).toLowerCase().includes(filters.person.toLowerCase()))
      && (!filters.category || row.data.category === filters.category)
      && (!filters.priority || row.data.priority === filters.priority)
      && (!filters.occurred || row.occurred_on === filters.occurred)
      && (!filters.review || row.data.due_on === filters.review)
      && (!filters.safeguarding || (kind === "incidents" && !row.is_draft && row.data.safeguarding === filters.safeguarding))
      && (!filters.status || status === filters.status);
  });
  const today = londonToday();
  const header = (key: keyof Filters, label: string, options?: Array<string | { value: string; label: string }>, type: "text" | "date" = "text") =>
    <HrFilterHeader id={`${kind}-${key}-filter`} label={label} value={filters[key]} options={options} type={type} dark onChange={value => setFilter(key, value)} />;
  const categories = [...new Set([...(kind === "risks" ? riskCategories : incidentCategories), ...records.map(row => row.data.category).filter(Boolean)])];
  const levels = kind === "risks" ? riskLevels : ["Low", "Moderate", "High", "Critical"];

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <table className="qa-case-table w-full table-fixed border-collapse text-left text-xs text-[#102c39]">
      <caption className="sr-only">{kind === "risks" ? "Individual risk assessments" : "Incidents and safeguarding"}. Filter each column from its heading.</caption>
      <thead className="bg-[#102c39] text-white"><tr>
        <th scope="col" className={`${kind === "risks" ? "w-[11%]" : "w-[9%]"} px-2 py-2`}>{header("reference", "Reference")}</th>
        <th scope="col" className={`${kind === "risks" ? "w-[17%]" : "w-[15%]"} px-2 py-2`}>{header("title", kind === "risks" ? "Risk" : "Incident")}</th>
        <th scope="col" className={`${kind === "risks" ? "w-[12%]" : "w-[10%]"} px-2 py-2`}>{header("home", "Home", homes.map(home => ({ value: home.id, label: home.name })))}</th>
        <th scope="col" className={`${kind === "risks" ? "w-[12%]" : "w-[10%]"} px-2 py-2`}>{header("person", kind === "risks" ? "Person" : "People")}</th>
        <th scope="col" className={`${kind === "risks" ? "w-[13%]" : "w-[11%]"} px-2 py-2`}>{header("category", "Type", categories)}</th>
        <th scope="col" className={`${kind === "risks" ? "w-[10%]" : "w-[9%]"} px-2 py-2`}>{header("priority", kind === "risks" ? "Residual" : "Severity", levels)}</th>
        <th scope="col" className="w-[9%] px-2 py-2">{header("occurred", kind === "risks" ? "Assessed" : "Occurred", undefined, "date")}</th>
        {kind === "risks" && <th scope="col" className="w-[9%] px-2 py-2">{header("review", "Review", undefined, "date")}</th>}
        {kind === "incidents" && <th scope="col" className="w-[13%] px-2 py-2">{header("safeguarding", "Safeguarding", [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "pending", label: "Pending assessment" }])}</th>}
        <th scope="col" className={`${kind === "risks" ? "w-[7%]" : "w-[9%]"} px-2 py-2`}>{header("status", "Status", ["Draft", ...caseStates[kind]])}</th>
        <th scope="col" className="w-12 px-1 py-2"><div className="sr-only">Details</div></th>
      </tr></thead>
      <tbody className="divide-y divide-slate-200">{shown.map(row => {
        const reviewOverdue = kind === "risks" && !row.is_draft && row.status !== "Closed" && row.data.due_on && row.data.due_on < today;
        return <tr key={row.id}>
          <td className="break-all px-2 py-3 font-semibold" title={row.reference}>{row.reference ?? "—"}</td>
          <td className="break-words px-2 py-3 font-medium">{row.title || "Untitled draft"}</td>
          <td className="break-words px-2 py-3">{homeName(row)}</td>
          <td className="break-words px-2 py-3">{personName(row)}</td>
          <td className="break-words px-2 py-3">{row.data.category || "—"}</td>
          <td className="px-2 py-3"><strong className={`inline-block rounded-full px-2.5 py-1 font-semibold ${severityTone(row.data.priority)}`}>{row.data.priority || "—"}</strong></td>
          <td className="px-2 py-3">{dateLabel(row.occurred_on)}</td>
          {kind === "risks" && <td className={`px-2 py-3 ${reviewOverdue ? "font-semibold text-red-800" : ""}`}>{dateLabel(row.data.due_on)}</td>}
          {kind === "incidents" && <td className="px-2 py-3"><strong className={`inline-block rounded-full px-2.5 py-1 font-semibold ${row.is_draft ? "bg-slate-100 text-slate-700" : row.data.safeguarding === "yes" ? "bg-red-100 text-red-900" : row.data.safeguarding === "pending" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{row.is_draft ? "—" : row.data.safeguarding === "yes" ? "Yes" : row.data.safeguarding === "pending" ? "Pending" : "No"}</strong></td>}
          <td className="px-2 py-3"><strong className={`inline-block rounded-full px-2.5 py-1 font-semibold ${statusTone(row.status, row.is_draft)}`}>{row.is_draft ? "Draft" : row.status}</strong></td>
          <td className="px-1 py-3"><button type="button" aria-label={`Open ${row.title || "record"}`} title="Open details" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700" onClick={() => onOpen(row)}><Plus size={18} aria-hidden /></button></td>
        </tr>;
      })}</tbody>
    </table>
    {!shown.length && <div className="p-6 text-center text-sm text-slate-600">No records match these filters.</div>}
  </div>;
}

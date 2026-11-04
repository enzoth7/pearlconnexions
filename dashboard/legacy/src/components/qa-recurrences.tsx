"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { HrFilterHeader } from "@/components/hr-register-controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildRecurrences, type Recurrence } from "@/lib/qa-recurrences";
import type { CaseRecord, Person } from "@/lib/qa-capture";
import type { Home } from "@/lib/types";

type Filters = { person: string; home: string; count: string; type: string; latest: string; open: string };
const initialFilters: Filters = { person: "", home: "", count: "", type: "", latest: "", open: "" };
function dateLabel(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function severityTone(value: string) {
  if (["Critical", "High"].includes(value)) return "bg-rose-100 text-rose-900";
  if (value === "Moderate") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-900";
}

export function QaRecurrences({ homes, records, people }: { homes: Home[]; records: CaseRecord[]; people: Person[] }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selected, setSelected] = useState<Recurrence | null>(null);
  const rows = buildRecurrences(records, people);
  const homeName = (id: string) => homes.find(home => home.id === id)?.name ?? "—";
  const visible = rows.filter(row =>
    (!filters.person || row.person.toLocaleLowerCase("en-GB").includes(filters.person.toLocaleLowerCase("en-GB"))) &&
    (!filters.home || row.homeId === filters.home) &&
    (!filters.count || (filters.count === "3+" ? row.incidents.length >= 3 : row.incidents.length === 2)) &&
    (!filters.type || row.types.includes(filters.type)) &&
    (!filters.latest || row.latest === filters.latest) &&
    (!filters.open || (filters.open === "Yes" ? row.openFollowUps > 0 : row.openFollowUps === 0)));
  const header = (key: keyof Filters, label: string, options?: Array<string | { value: string; label: string }>, type: "text" | "date" = "text") =>
    <HrFilterHeader id={`recurrences-${key}`} label={label} value={filters[key]} options={options} type={type} dark onChange={value => setFilters(current => ({ ...current, [key]: value }))} />;
  const types = [...new Set(rows.flatMap(row => row.types))].sort();

  return <div className="space-y-6">
    <header><h1 className="text-3xl font-semibold tracking-tight text-[#102c39]">Recurrences</h1><div className="mt-2 text-sm text-slate-600">People involved in two or more registered incidents.</div></header>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full table-fixed border-collapse text-left text-xs text-[#102c39]">
        <caption className="sr-only">Recurring incidents by person and home. Filter each column from its heading.</caption>
        <thead className="bg-[#102c39] text-white"><tr>
          <th scope="col" className="w-[18%] px-3 py-2">{header("person", "Person")}</th>
          <th scope="col" className="w-[16%] px-3 py-2">{header("home", "Home", homes.map(home => ({ value: home.id, label: home.name })))}</th>
          <th scope="col" className="w-[13%] px-3 py-2">{header("count", "Incidents", ["2", "3+"])}</th>
          <th scope="col" className="w-[27%] px-3 py-2">{header("type", "Types", types)}</th>
          <th scope="col" className="w-[14%] px-3 py-2">{header("latest", "Latest", undefined, "date")}</th>
          <th scope="col" className="w-[8%] px-2 py-2">{header("open", "Open", ["Yes", "No"])}</th>
          <th scope="col" className="w-[4%] px-1 py-2"><div className="sr-only">Details</div></th>
        </tr></thead>
        <tbody className="divide-y divide-slate-200">{visible.map(row => <tr key={row.key}>
          <td className="break-words px-3 py-3 font-semibold">{row.person}</td>
          <td className="break-words px-3 py-3">{homeName(row.homeId)}</td>
          <td className="px-3 py-3"><strong className="inline-block rounded-full bg-sky-100 px-3 py-1 text-sky-900">{row.incidents.length}</strong></td>
          <td className="break-words px-3 py-3">{row.types.join(", ")}</td>
          <td className="px-3 py-3">{dateLabel(row.latest)}</td>
          <td className="px-2 py-3"><strong className={`inline-block rounded-full px-3 py-1 ${row.openFollowUps ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{row.openFollowUps}</strong></td>
          <td className="px-1 py-3"><button type="button" aria-label={`View incidents for ${row.person}`} title="View incidents" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700" onClick={() => setSelected(row)}><Plus size={18} aria-hidden /></button></td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <div className="p-6 text-center text-sm text-slate-600">{rows.length ? "No people match these filters." : "No repeated incidents recorded yet."}</div>}
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent>{selected && <div className="space-y-5">
      <DialogHeader><DialogTitle className="text-xl text-[#102c39]">{selected.person} · {homeName(selected.homeId)}</DialogTitle><div className="text-sm text-slate-600">{selected.incidents.length} incidents · {selected.openFollowUps} open follow-ups</div></DialogHeader>
      <div className="space-y-3">{selected.incidents.map(incident => <div key={incident.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold text-[#102c39]">{incident.title}</div><div className="mt-1 text-xs text-slate-600">{incident.reference ?? "—"} · {dateLabel(incident.occurred_on)} · {incident.data.category}</div></div><div className="flex flex-wrap gap-2"><strong className={`rounded-full px-3 py-1 text-xs ${severityTone(incident.data.priority)}`}>{incident.data.priority || "—"}</strong><strong className={`rounded-full px-3 py-1 text-xs ${incident.status === "Closed" ? "bg-emerald-100 text-emerald-900" : "bg-sky-100 text-sky-900"}`}>{incident.status}</strong></div></div>
        {incident.data.description && <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{incident.data.description}</div>}
      </div>)}</div>
    </div>}</DialogContent></Dialog>
  </div>;
}

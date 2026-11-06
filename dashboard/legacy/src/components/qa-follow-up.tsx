"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HrFilterHeader } from "@/components/hr-register-controls";
import { londonToday, type CaseAction, type CaseRecord } from "@/lib/qa-capture";
import type { Home } from "@/lib/types";

type FollowUpRow = { id: string; action: CaseAction; record: CaseRecord; home: string };
type Filters = { action: string; reference: string; home: string; kind: string; owner: string; due: string; status: string };
const emptyFilters: Filters = { action: "", reference: "", home: "", kind: "", owner: "", due: "", status: "" };

function dateLabel(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year.slice(2)}` : value;
}

export function QaFollowUp({ homes, records, canOpenIncidents = true, canOpenRisks = true }: { homes: Home[]; records: CaseRecord[]; canOpenIncidents?: boolean; canOpenRisks?: boolean }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const today = londonToday();
  const rows: FollowUpRow[] = records.filter(record => !record.is_draft).flatMap(record => record.actions.map(action => ({ id: action.id, action, record, home: homes.find(home => home.id === record.home_id)?.name ?? "—" })));
  rows.sort((a, b) => (a.action.status === "Completed") === (b.action.status === "Completed")
    ? (a.action.due_on || "9999").localeCompare(b.action.due_on || "9999")
    : a.action.status === "Completed" ? 1 : -1);
  const shown = rows.filter(row =>
    (!filters.action || row.action.description.toLowerCase().includes(filters.action.toLowerCase())) &&
    (!filters.reference || `${row.record.reference ?? ""} ${row.record.title}`.toLowerCase().includes(filters.reference.toLowerCase())) &&
    (!filters.home || row.record.home_id === filters.home) &&
    (!filters.kind || row.record.kind === filters.kind) &&
    (!filters.owner || row.action.owner.toLowerCase().includes(filters.owner.toLowerCase())) &&
    (!filters.due || row.action.due_on === filters.due) &&
    (!filters.status || (filters.status === "Overdue"
      ? row.action.status !== "Completed" && Boolean(row.action.due_on && row.action.due_on < today)
      : filters.status === "Pending"
        ? row.action.status === "Pending" && !(row.action.due_on && row.action.due_on < today)
        : row.action.status === filters.status)));
  const header = (key: keyof Filters, label: string, options?: Array<string | { value: string; label: string }>, type: "text" | "date" = "text") =>
    <HrFilterHeader id={`follow-up-${key}`} label={label} value={filters[key]} options={options} type={type} dark onChange={value => setFilters(current => ({ ...current, [key]: value }))} />;

  return <div className="space-y-6">
    <header><h1 className="text-3xl font-semibold tracking-tight text-[#102c39]">Follow-up</h1><div className="mt-2 text-sm text-slate-600">Actions recorded against incidents and individual risks.</div></header>
    <div className="grid gap-4 sm:grid-cols-3" aria-label="Follow-up totals">
      {[
        { label: "Pending", count: rows.filter(row => row.action.status !== "Completed").length, color: "text-teal-800" },
        { label: "Overdue", count: rows.filter(row => row.action.status !== "Completed" && row.action.due_on && row.action.due_on < today).length, color: "text-red-700" },
        { label: "Completed", count: rows.filter(row => row.action.status === "Completed").length, color: "text-emerald-700" },
      ].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center"><div className="text-sm font-medium text-[#102c39]">{item.label}</div><strong className={`mt-2 block text-4xl tabular-nums ${item.color}`}>{item.count}</strong></div>)}
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full table-fixed border-collapse text-left text-xs text-[#102c39]">
        <caption className="sr-only">Follow-up actions from incidents and individual risks. Filter from each heading.</caption>
        <thead className="bg-[#102c39] text-white"><tr>
          <th scope="col" className="w-[22%] px-2 py-2">{header("action", "Action")}</th>
          <th scope="col" className="w-[16%] px-2 py-2">{header("reference", "Record")}</th>
          <th scope="col" className="w-[14%] px-2 py-2">{header("home", "Home", homes.map(home => ({ value: home.id, label: home.name })))}</th>
          <th scope="col" className="w-[10%] px-2 py-2">{header("kind", "Source", [{ value: "incidents", label: "Incident" }, { value: "risks", label: "Risk" }])}</th>
          <th scope="col" className="w-[12%] px-2 py-2">{header("owner", "Owner")}</th>
          <th scope="col" className="w-[9%] px-2 py-2">{header("due", "Due", undefined, "date")}</th>
          <th scope="col" className="w-[11%] px-2 py-2">{header("status", "Status", ["Pending", "Overdue", "Completed"])}</th>
          <th scope="col" className="w-12 px-1 py-2"><div className="sr-only">Open record</div></th>
        </tr></thead>
        <tbody className="divide-y divide-slate-200">{shown.map(row => {
          const overdue = row.action.status !== "Completed" && row.action.due_on && row.action.due_on < today;
          return <tr key={`${row.record.id}-${row.id}`}>
            <td className="break-words px-2 py-3 font-medium">{row.action.description}</td>
            <td className="break-words px-2 py-3"><strong className="block">{row.record.reference ?? "—"}</strong><div className="mt-1 text-slate-600">{row.record.title}</div></td>
            <td className="break-words px-2 py-3">{row.home}</td>
            <td className="px-2 py-3">{row.record.kind === "incidents" ? "Incident" : "Risk"}</td>
            <td className="break-words px-2 py-3">{row.action.owner || "—"}</td>
            <td className={`px-2 py-3 tabular-nums ${overdue ? "font-semibold text-red-700" : ""}`}>{dateLabel(row.action.due_on)}</td>
            <td className="px-2 py-3"><strong className={`inline-block rounded-full px-2.5 py-1 font-semibold ${row.action.status === "Completed" ? "bg-emerald-100 text-emerald-900" : overdue ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>{overdue ? "Overdue" : row.action.status}</strong></td>
            <td className="px-1 py-3">{(row.record.kind === "incidents" ? canOpenIncidents : canOpenRisks) && <Link href={`/qa/${row.record.kind}?record=${encodeURIComponent(row.record.id)}`} aria-label={`Open ${row.record.reference ?? row.record.title}`} title="Open record" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"><Plus size={18} aria-hidden /></Link>}</td>
          </tr>;
        })}</tbody>
      </table>
      {!shown.length && <div className="p-6 text-center text-sm text-slate-600">No actions match these filters.</div>}
    </div>
  </div>;
}

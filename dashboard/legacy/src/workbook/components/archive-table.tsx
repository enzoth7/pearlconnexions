"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { RecurrenceBadge } from "@/workbook/components/status-badge";
import { formatDate, formatPeriodMonth, type ActionRecord } from "@/workbook/lib/utils";

type Row = { action: ActionRecord; owner: string; signer: string; date: string | null; haystack: string };

function rowFor(action: ActionRecord): Row {
  const owner = action.participants.find((p) => p.responsibility_type !== "Support")?.manager.name || "—";
  const signer = action.signoffs?.[0]?.signed_off_by_name || (owner !== "—" ? `${owner} / Joel Samuel` : "Joel Samuel");
  const date = action.signoffs?.[0]?.signed_off_at?.slice(0, 10) || action.completed_at;
  const haystack = [
    action.reference, action.title, owner, signer, action.workstream?.name,
    ...action.participants.map((p) => p.manager.name),
    formatPeriodMonth(action.period_month), formatDate(date),
  ].join(" ").toLocaleLowerCase("en-GB");
  return { action, owner, signer, date, haystack };
}

/** Completed Actions register with a search over reference, action, people, workstream and date. */
export function ArchiveTable({ actions }: { actions: ActionRecord[] }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => actions.map(rowFor), [actions]);
  const terms = query.trim().toLocaleLowerCase("en-GB").split(/\s+/).filter(Boolean);
  const shown = terms.length ? rows.filter((row) => terms.every((term) => row.haystack.includes(term))) : rows;

  return (
    <>
      <PageHeader
        title="Completed Actions"
        description="Actions completed and signed off by leadership."
        action={
          <label className="relative flex w-full items-center sm:w-80">
            <small className="sr-only">Search completed actions</small>
            <input
              type="search"
              className="field pr-10"
              placeholder="Search by ref, action, person…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" className="absolute right-2 flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setQuery("")} aria-label="Clear search">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>
        }
      />
      {terms.length > 0 && (
        <div className="mb-3 text-sm text-slate-600" role="status">
          {shown.length} of {rows.length} completed actions
        </div>
      )}
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Action</th>
              <th>Owner</th>
              <th>Workstream</th>
              <th>Signed off by</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ action: a, owner, signer, date }) => (
              <tr key={a.id}>
                <td>
                  <Link className="font-mono font-bold text-[#007A91] hover:text-[#0097B2] hover:underline" href={`/workbook/actions/${a.id}`}>
                    {a.reference}
                  </Link>
                </td>
                <td className="font-semibold text-slate-900">
                  {a.title}
                  {a.recurrence && <div className="mt-1"><RecurrenceBadge action={a} showMonth /></div>}
                </td>
                <td className="text-sm font-medium text-slate-700">{owner}</td>
                <td className="text-sm text-slate-600">{a.workstream?.name}</td>
                <td>
                  <strong className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{signer}</strong>
                </td>
                <td className="whitespace-nowrap text-sm text-slate-600">{formatDate(date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <div className="p-12 text-center">
            <h2 className="font-bold text-slate-900">{rows.length ? "No completed actions match this search" : "No completed actions yet"}</h2>
            <div className="mt-2 text-sm text-slate-500">
              {rows.length ? "Try another reference, name or word from the action." : "Completed and signed-off actions will appear here."}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

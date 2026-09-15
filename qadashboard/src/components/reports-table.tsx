"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FilterX, Search, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/calculations";
import type { SubmissionStatus } from "@/lib/types";

export type ReportTableRow = {
  id: string;
  home: string;
  period: string;
  dataClass: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  isLate: boolean;
  incidents: number | null;
  reportedWithin24h: number | null;
};

const selectClass = "h-9 w-full min-w-32 cursor-pointer rounded-md border border-slate-300 bg-white px-2 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function ReportsTable({ rows, incidentMode }: { rows: ReportTableRow[]; incidentMode: boolean }) {
  const [home, setHome] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [timing, setTiming] = useState("all");
  const [minimumIncidents, setMinimumIncidents] = useState("");
  const [followUp, setFollowUp] = useState("all");

  const periods = useMemo(() => Array.from(new Set(rows.map((row) => row.period))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const normalizedHome = home.trim().toLocaleLowerCase();
    const minimum = minimumIncidents === "" ? null : Number(minimumIncidents);
    return rows.filter((row) => {
      const outstanding = row.incidents !== null && row.reportedWithin24h !== null
        ? Math.max(0, row.incidents - row.reportedWithin24h)
        : null;
      return (!normalizedHome || row.home.toLocaleLowerCase().includes(normalizedHome))
        && (period === "all" || row.period === period)
        && (status === "all" || row.status === status)
        && (timing === "all" || (timing === "late" ? row.isLate : !row.isLate))
        && (minimum === null || (row.incidents ?? 0) >= minimum)
        && (followUp === "all" || (followUp === "pending" ? (outstanding ?? 0) > 0 : outstanding === 0));
    });
  }, [followUp, home, minimumIncidents, period, rows, status, timing]);

  const hasFilters = home !== "" || period !== "all" || status !== "all" || timing !== "all" || minimumIncidents !== "" || followUp !== "all";
  function clearFilters() {
    setHome("");
    setPeriod("all");
    setStatus("all");
    setTiming("all");
    setMinimumIncidents("");
    setFollowUp("all");
  }

  const homeFilter = <div className="relative mt-2 min-w-40"><Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-slate-400" /><Input value={home} onChange={(event) => setHome(event.target.value)} placeholder="Filter homes…" aria-label="Filter reports by home" className="h-9 bg-white ps-8 text-xs font-medium normal-case tracking-normal" /></div>;
  const periodFilter = <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter reports by period" className={selectClass}><option value="all">All periods</option>{periods.map((item) => <option key={item} value={item}>{item}</option>)}</select>;

  return <div className="space-y-3">
    <div className="flex min-h-10 items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-600"><span className="font-bold text-[#17345f]">{filteredRows.length}</span> of {rows.length} reports</p>
      {hasFilters ? <Button type="button" variant="ghost" onClick={clearFilters} className="h-10 cursor-pointer text-slate-600"><FilterX className="size-4" />Clear filters</Button> : null}
    </div>
    <div className="data-table-wrap">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-[#eef4fb] text-xs uppercase tracking-wide text-[#31537e]">
          {incidentMode ? <tr className="align-top">
            <th className="px-4 py-3 text-start"><span>Home</span>{homeFilter}</th>
            <th className="px-4 py-3 text-start"><span>Period</span><div className="mt-2">{periodFilter}</div></th>
            <th className="min-w-36 px-4 py-3 text-end"><label htmlFor="minimum-incidents" className="block">Incidents</label><div className="mt-2 flex justify-end"><Input id="minimum-incidents" type="number" min="0" value={minimumIncidents} onChange={(event) => setMinimumIncidents(event.target.value)} placeholder="Minimum" className="h-9 w-28 bg-white text-end text-xs font-medium normal-case tracking-normal" /></div></th>
            <th className="min-w-44 px-4 py-3 text-end">Reported within 24h</th>
            <th className="px-4 py-3 text-start"><label htmlFor="follow-up-filter">Follow-up</label><select id="follow-up-filter" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className={`mt-2 ${selectClass}`}><option value="all">All</option><option value="pending">Pending</option><option value="complete">Up to date</option></select></th>
            <th className="px-4 py-3 text-end">Action</th>
          </tr> : <tr className="align-top">
            <th className="px-4 py-3 text-start"><span>Home</span>{homeFilter}</th>
            <th className="px-4 py-3 text-start"><span>Period</span><div className="mt-2">{periodFilter}</div></th>
            <th className="px-4 py-3 text-start"><label htmlFor="status-filter">Status</label><select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value)} className={`mt-2 ${selectClass}`}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="reopened">Reopened</option></select></th>
            <th className="px-4 py-3 text-start">Submitted</th>
            <th className="px-4 py-3 text-start"><label htmlFor="timing-filter">Timing</label><select id="timing-filter" value={timing} onChange={(event) => setTiming(event.target.value)} className={`mt-2 ${selectClass}`}><option value="all">All</option><option value="on-time">On time</option><option value="late">Late</option></select></th>
            <th className="px-4 py-3 text-end">Action</th>
          </tr>}
        </thead>
        <tbody>{filteredRows.map((row) => {
          const outstanding = row.incidents !== null && row.reportedWithin24h !== null ? Math.max(0, row.incidents - row.reportedWithin24h) : null;
          return incidentMode ? <tr key={row.id} className="border-t transition-colors hover:bg-blue-50/40">
            <td className="px-4 py-3 font-bold">{row.home}</td><td className="px-4 py-3">{row.period}</td><td className="px-4 py-3 text-end font-mono text-xl font-black text-[#17345f]">{formatNumber(row.incidents)}</td><td className="px-4 py-3 text-end font-mono text-lg font-bold">{formatNumber(row.reportedWithin24h)}</td><td className="px-4 py-3">{outstanding && outstanding > 0 ? <span className="inline-flex items-center gap-1 font-semibold text-orange-700"><TriangleAlert className="size-4" />{outstanding} outstanding</span> : <span className="font-medium text-emerald-700">Up to date</span>}</td><td className="px-4 py-3 text-end"><Button asChild variant="outline" className="h-10"><Link href={`/director/reviews/${row.id}?view=incidents#metric-Inc_Total`}>Open report<ArrowRight /></Link></Button></td>
          </tr> : <tr key={row.id} className="border-t transition-colors hover:bg-blue-50/40">
            <td className="px-4 py-3 font-bold">{row.home}</td><td className="px-4 py-3">{row.period}<span className="ms-2 text-xs text-muted-foreground">{row.dataClass}</span></td><td className="px-4 py-3"><StatusBadge status={row.status} /></td><td className="px-4 py-3">{row.submittedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(row.submittedAt)) : "—"}</td><td className="px-4 py-3">{row.isLate ? <span className="inline-flex items-center gap-1 font-semibold text-amber-800">Late</span> : "On time"}</td><td className="px-4 py-3 text-end"><Button asChild variant="outline" className="h-10"><Link href={`/director/reviews/${row.id}`}>Review<ArrowRight /></Link></Button></td>
          </tr>;
        })}</tbody>
      </table>
      {!filteredRows.length ? <div className="border-t px-6 py-12 text-center"><p className="font-bold text-[#17345f]">No reports match these filters</p><p className="mt-1 text-sm text-slate-500">Change a filter or clear them to see all reports.</p></div> : null}
    </div>
  </div>;
}

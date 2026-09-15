"use client";

import { useMemo, useState } from "react";
import { FilterX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/calculations";

export type ReviewMetricRow = {
  code: string;
  name: string;
  category: string;
  expected: number | null;
  actual: number | null;
  score: number | null;
  expectedApplicable: boolean;
};

const selectClass = "mt-2 h-9 w-full min-w-32 cursor-pointer rounded-md border border-slate-300 bg-white px-2 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

export function ReviewMetricsTable({ rows }: { rows: ReviewMetricRow[] }) {
  const [metric, setMetric] = useState("");
  const [category, setCategory] = useState("all");
  const [collection, setCollection] = useState("all");
  const [performance, setPerformance] = useState("all");
  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const query = metric.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesMetric = !query || `${row.name} ${row.code}`.toLocaleLowerCase().includes(query);
      const matchesCategory = category === "all" || row.category === category;
      const matchesCollection = collection === "all" || (collection === "collected" ? row.actual !== null : row.actual === null);
      const matchesPerformance = performance === "all"
        || (performance === "high" && row.score !== null && row.score >= 0.9)
        || (performance === "medium" && row.score !== null && row.score >= 0.8 && row.score < 0.9)
        || (performance === "low" && row.score !== null && row.score < 0.8)
        || (performance === "na" && !row.expectedApplicable);
      return matchesMetric && matchesCategory && matchesCollection && matchesPerformance;
    });
  }, [category, collection, metric, performance, rows]);

  const hasFilters = metric !== "" || category !== "all" || collection !== "all" || performance !== "all";
  function clearFilters() {
    setMetric("");
    setCategory("all");
    setCollection("all");
    setPerformance("all");
  }

  return <div className="space-y-3">
    <div className="flex min-h-10 items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-600"><span className="font-bold text-[#17345f]">{filteredRows.length}</span> of {rows.length} metrics</p>
      {hasFilters ? <Button type="button" variant="ghost" onClick={clearFilters} className="h-10 cursor-pointer text-slate-600"><FilterX className="size-4" />Clear filters</Button> : null}
    </div>
    <div className="data-table-wrap">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-[#eef4fb] text-xs uppercase tracking-wide text-[#31537e]">
          <tr className="align-top">
            <th className="px-4 py-3 text-start"><span>Metric</span><div className="relative mt-2 min-w-52"><Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-slate-400" /><Input value={metric} onChange={(event) => setMetric(event.target.value)} placeholder="Name or code…" aria-label="Filter metrics by name or code" className="h-9 bg-white ps-8 text-xs font-medium normal-case tracking-normal" /></div></th>
            <th className="px-4 py-3 text-start"><label htmlFor="metric-category-filter">Category</label><select id="metric-category-filter" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></th>
            <th className="px-4 py-3 text-end">Expected</th>
            <th className="px-4 py-3 text-end"><label htmlFor="collection-filter">Actual</label><select id="collection-filter" value={collection} onChange={(event) => setCollection(event.target.value)} className={selectClass}><option value="all">All values</option><option value="collected">Collected</option><option value="missing">Not collected</option></select></th>
            <th className="px-4 py-3 text-end"><label htmlFor="performance-filter">Score</label><select id="performance-filter" value={performance} onChange={(event) => setPerformance(event.target.value)} className={selectClass}><option value="all">All scores</option><option value="high">90% and above</option><option value="medium">80–89%</option><option value="low">Below 80%</option><option value="na">Not applicable</option></select></th>
          </tr>
        </thead>
        <tbody>{filteredRows.map((row) => <tr id={`metric-${row.code}`} key={row.code} className="scroll-mt-6 border-t transition-colors hover:bg-blue-50/40 target:bg-amber-100"><td className="px-4 py-3"><span className="font-semibold">{row.name}</span><span className="block font-mono text-xs text-muted-foreground">{row.code}</span></td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3 text-end font-mono">{row.expectedApplicable ? formatNumber(row.expected) : <span className="font-sans text-xs font-medium text-slate-500">Not applicable</span>}</td><td className="px-4 py-3 text-end font-mono">{formatNumber(row.actual)}</td><td className="px-4 py-3 text-end font-mono">{!row.expectedApplicable ? <span className="font-sans text-xs font-medium text-slate-500">Not applicable</span> : row.score === null ? <span className="font-sans text-xs font-medium text-slate-500">Not collected</span> : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(row.score)}</td></tr>)}</tbody>
      </table>
      {!filteredRows.length ? <div className="border-t px-6 py-12 text-center"><p className="font-bold text-[#17345f]">No metrics match these filters</p><p className="mt-1 text-sm text-slate-500">Change a filter or clear them to see the full report.</p></div> : null}
    </div>
  </div>;
}

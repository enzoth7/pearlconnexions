"use client";

import { useMemo, useState } from "react";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrFilterHeader } from "@/components/hr-register-controls";
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
      <div className="text-sm font-medium text-slate-600"><strong className="text-[#17345f]">{filteredRows.length}</strong> of {rows.length} metrics</div>
      {hasFilters ? <Button type="button" variant="ghost" onClick={clearFilters} className="h-10 cursor-pointer text-slate-600"><FilterX className="size-4" />Clear filters</Button> : null}
    </div>
    <div className="data-table-wrap">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-[#eef4fb] text-xs uppercase tracking-wide text-[#31537e]">
          <tr className="align-top">
            <th className="px-4 py-3 text-start"><HrFilterHeader id="metric-name-filter" label="Metric" value={metric} onChange={setMetric} dark /></th>
            <th className="px-4 py-3 text-start"><HrFilterHeader id="metric-category-filter" label="Category" value={category === "all" ? "" : category} options={categories} onChange={value => setCategory(value || "all")} dark /></th>
            <th className="px-4 py-3 text-end">Expected</th>
            <th className="px-4 py-3 text-end"><HrFilterHeader id="collection-filter" label="Actual" value={collection === "all" ? "" : collection} options={[{ value: "collected", label: "Collected" }, { value: "missing", label: "Not collected" }]} onChange={value => setCollection(value || "all")} dark /></th>
            <th className="px-4 py-3 text-end"><HrFilterHeader id="performance-filter" label="Score" value={performance === "all" ? "" : performance} options={[{ value: "high", label: "90% and above" }, { value: "medium", label: "80–89%" }, { value: "low", label: "Below 80%" }, { value: "na", label: "Not applicable" }]} onChange={value => setPerformance(value || "all")} dark /></th>
          </tr>
        </thead>
        <tbody>{filteredRows.map((row) => <tr id={`metric-${row.code}`} key={row.code} className="scroll-mt-6 border-t transition-colors hover:bg-blue-50/40 target:bg-amber-100"><td className="px-4 py-3"><strong>{row.name}</strong><small className="block font-mono text-xs text-muted-foreground">{row.code}</small></td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3 text-end font-mono">{row.expectedApplicable ? formatNumber(row.expected) : <small className="font-sans font-medium text-slate-500">Not applicable</small>}</td><td className="px-4 py-3 text-end font-mono">{formatNumber(row.actual)}</td><td className="px-4 py-3 text-end font-mono">{!row.expectedApplicable ? <small className="font-sans font-medium text-slate-500">Not applicable</small> : row.score === null ? <small className="font-sans font-medium text-slate-500">Not collected</small> : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(row.score)}</td></tr>)}</tbody>
      </table>
      {!filteredRows.length ? <div className="border-t px-6 py-12 text-center"><div className="font-bold text-[#17345f]">No metrics match these filters</div><div className="mt-1 text-sm text-slate-500">Change a filter or clear them to see the full report.</div></div> : null}
    </div>
  </div>;
}

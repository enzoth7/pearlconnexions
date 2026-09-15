"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriodLabel } from "@/lib/periods";
import type { Home, Period } from "@/lib/types";

export function DashboardFilters({ periods, homes, current }: { periods: Period[]; homes: Home[]; current: { period: string; home: string; provision: string } }) {
  const router = useRouter();
  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete(key); else params.set(key, value);
    if (key === "period") {
      const period = periods.find((item) => item.id === value);
      if (period) params.set("class", period.data_class);
    }
    router.push(`/director?${params.toString()}`);
  }
  return <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,42,78,0.06)] sm:grid-cols-3" aria-label="Dashboard filters">
    <Select value={current.period} onValueChange={(value) => update("period", value)}>
      <SelectTrigger className="h-11 w-full" aria-label="Reporting period"><SelectValue placeholder="Reporting period" /></SelectTrigger>
      <SelectContent>{periods.map((period) => <SelectItem key={period.id} value={period.id}>{formatPeriodLabel(period)} · {period.data_class}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={current.home || "all"} onValueChange={(value) => update("home", value)}>
      <SelectTrigger className="h-11 w-full" aria-label="Home"><SelectValue placeholder="All homes" /></SelectTrigger>
      <SelectContent><SelectItem value="all">All homes</SelectItem>{homes.map((home) => <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>)}</SelectContent>
    </Select>
    <Select value={current.provision || "all"} onValueChange={(value) => update("provision", value)}>
      <SelectTrigger className="h-11 w-full" aria-label="Provision"><SelectValue placeholder="All provisions" /></SelectTrigger>
      <SelectContent><SelectItem value="all">All provisions</SelectItem>{["Children's Home", "Supported Living", "Supported Accommodation"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}

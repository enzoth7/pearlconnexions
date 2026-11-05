"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Home } from "@/lib/types";

type FilterState = { home: string; month: string; provision: string };

const provisions = ["Children's Home", "Supported Accommodation", "Supported Living"] as const;

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

export function QaOverviewFilters({ homes, months, current }: { homes: Pick<Home, "id" | "name" | "provision">[]; months: string[]; current: FilterState }) {
  const router = useRouter();
  const availableHomes = homes.filter(home => !current.provision || home.provision === current.provision);

  function update(key: keyof FilterState, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete(key);
    else params.set(key, value);
    if (key === "provision" && current.home && !homes.some(home => home.id === current.home && (!value || value === "all" || home.provision === value))) params.delete("home");
    router.push(`/qa${params.size ? `?${params.toString()}` : ""}`);
  }

  const trigger = "h-11 w-full justify-between rounded-xl border-slate-300 bg-white px-3 text-sm font-medium text-[#102c39] shadow-sm hover:border-teal-600 focus-visible:ring-teal-600";
  return <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto" aria-label="Quality overview filters">
    <div className="min-w-0 lg:w-48"><div className="mb-1 text-xs font-medium text-slate-600">Home</div>
      <Select value={current.home || "all"} onValueChange={value => update("home", value)}>
        <SelectTrigger className={trigger} aria-label="Filter by home"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" align="start"><SelectItem value="all">All homes</SelectItem>{availableHomes.map(home => <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="min-w-0 lg:w-44"><div className="mb-1 text-xs font-medium text-slate-600">Month</div>
      <Select value={current.month} onValueChange={value => update("month", value)}>
        <SelectTrigger className={trigger} aria-label="Filter by month"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" align="start">{months.map(month => <SelectItem key={month} value={month}>{monthLabel(month)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="min-w-0 lg:w-56"><div className="mb-1 text-xs font-medium text-slate-600">Service type</div>
      <Select value={current.provision || "all"} onValueChange={value => update("provision", value)}>
        <SelectTrigger className={trigger} aria-label="Filter by service type"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" align="start"><SelectItem value="all">All services</SelectItem>{provisions.map(provision => <SelectItem key={provision} value={provision}>{provision}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  </div>;
}

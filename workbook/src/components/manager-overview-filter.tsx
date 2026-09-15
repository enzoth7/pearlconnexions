"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Manager } from "@/lib/utils";

export function ManagerOverviewFilter({
  managers,
  selectedManagerId,
}: {
  managers: Manager[];
  selectedManagerId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectManager(managerId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (managerId) {
      params.set("manager", managerId);
    } else {
      params.delete("manager");
    }

    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className="w-full sm:w-64">
      <label className="label" htmlFor="overview-manager-filter">
        View overview for
      </label>
      <select
        id="overview-manager-filter"
        className="field"
        value={selectedManagerId ?? ""}
        onChange={(event) => selectManager(event.target.value)}
        disabled={isPending}
        aria-describedby="overview-manager-filter-status"
      >
        <option value="">All managers</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.name}
          </option>
        ))}
      </select>
      <span id="overview-manager-filter-status" className="sr-only" aria-live="polite">
        {isPending ? "Updating overview" : ""}
      </span>
    </div>
  );
}

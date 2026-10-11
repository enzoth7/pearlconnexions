"use client";

import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Manager, Workstream } from "@/lib/utils";

type FilterValues = {
  query: string;
  managerId: string;
  workstreamId: string;
  status: string;
  priority: string;
  timing: string;
};

export function ReviewFilters({
  managers,
  workstreams,
  values,
  hasFilters,
}: {
  managers: Manager[];
  workstreams: Workstream[];
  values: FilterValues;
  hasFilters: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(values.query);
  const [pending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyFilters(form: HTMLFormElement, queryOverride?: string) {
    const data = new FormData(form);
    if (queryOverride !== undefined) data.set("q", queryOverride);
    const params = new URLSearchParams();

    for (const [key, value] of data.entries()) {
      const text = value.toString().trim();
      if (text) params.set(key, text);
    }

    startTransition(() => {
      router.replace(params.size ? `/reviews?${params.toString()}` : "/reviews", { scroll: false });
    });
  }

  return (
    <section className="card mb-4 p-4" aria-labelledby="review-filters-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="text-[#007A91]" size={18} />
          <h2 id="review-filters-title" className="text-sm font-bold text-slate-900">
            Filter action reviews
          </h2>
        </div>
        {hasFilters && (
          <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100" href="/reviews">
            <X aria-hidden="true" size={15} /> Clear filters
          </Link>
        )}
      </div>

      <form
        aria-busy={pending}
        className={`grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${pending ? "opacity-70" : ""}`}
        onChange={(event) => {
          if ((event.target as HTMLInputElement).name !== "q") applyFilters(event.currentTarget);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(event.currentTarget);
        }}
      >
        <div>
          <label className="label" htmlFor="review-search">Search</label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              className="field pl-10"
              id="review-search"
              name="q"
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (searchTimer.current) clearTimeout(searchTimer.current);
                const form = event.currentTarget.form;
                if (form) searchTimer.current = setTimeout(() => applyFilters(form, nextQuery), 350);
              }}
              placeholder="Reference or action"
              type="search"
              value={query}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="review-manager">Manager</label>
          <select className="field" defaultValue={values.managerId} id="review-manager" name="manager">
            <option value="">All managers</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="review-workstream">Workstream</label>
          <select className="field" defaultValue={values.workstreamId} id="review-workstream" name="workstream">
            <option value="">All workstreams</option>
            {workstreams.map((workstream) => <option key={workstream.id} value={workstream.id}>{workstream.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="review-status">Status</label>
          <select className="field" defaultValue={values.status} id="review-status" name="status">
            <option value="">All statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="At Risk">At Risk</option>
            <option value="Extended">Extended</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="review-priority">Priority</label>
          <select className="field" defaultValue={values.priority} id="review-priority" name="priority">
            <option value="">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Unassigned">Unassigned</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="review-timing">Next review</label>
          <select className="field" defaultValue={values.timing} id="review-timing" name="timing">
            <option value="">Any date</option>
            <option value="overdue">Review overdue</option>
            <option value="next-7-days">Due in the next 7 days</option>
            <option value="scheduled">Date scheduled</option>
            <option value="not-set">Date not set</option>
          </select>
        </div>
        <span className="sr-only" aria-live="polite">{pending ? "Updating reviews" : ""}</span>
      </form>
    </section>
  );
}

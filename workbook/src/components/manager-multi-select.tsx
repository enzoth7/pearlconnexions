"use client";

import { Check, ChevronDown, Users, X } from "lucide-react";
import { useState } from "react";
import type { Manager } from "@/lib/utils";

export function ManagerMultiSelect({
  managers,
  defaultValue = [],
  id,
  name = "owner_manager_ids",
  label = "Lead Managers (Owners)",
  description = "Select as many managers as this action needs.",
  menuClassName = "",
}: {
  managers: Manager[];
  defaultValue?: string[];
  id: string;
  name?: string;
  label?: string;
  description?: string;
  menuClassName?: string;
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(defaultValue));
  const selectedManagers = managers.filter((manager) => selectedIds.has(manager.id));
  const descriptionId = `${id}-description`;

  function toggleManager(managerId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(managerId)) next.delete(managerId);
      else next.add(managerId);
      return next;
    });
  }

  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <p className="mb-2 text-xs text-slate-500" id={descriptionId}>
        {description}
      </p>

      {selectedManagers.map((manager) => (
        <input key={manager.id} type="hidden" name={name} value={manager.id} />
      ))}
      <input type="hidden" name="owner_managers_present" value="1" />

      <details className="group relative">
        <summary
          className="field flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden"
          aria-labelledby={`${id}-label`}
          aria-describedby={descriptionId}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Users aria-hidden="true" className="shrink-0 text-slate-400" size={17} />
            <span className={selectedManagers.length ? "truncate text-slate-900" : "text-slate-500"}>
              {selectedManagers.length === 0
                ? "Select managers"
                : `${selectedManagers.length} manager${selectedManagers.length === 1 ? "" : "s"} selected`}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            size={18}
          />
        </summary>

        <fieldset
          className={`absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl ${menuClassName}`}
        >
          <legend className="sr-only">Choose lead managers</legend>
          {managers.map((manager) => {
            const checked = selectedIds.has(manager.id);
            return (
              <label
                key={manager.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleManager(manager.id)}
                />
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-[#0097B2] bg-[#0097B2] text-white"
                      : "border-slate-300 bg-white text-transparent"
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{manager.name}</span>
                  {manager.role_title && (
                    <span className="block truncate text-xs text-slate-500">{manager.role_title}</span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      </details>

      {selectedManagers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
          {selectedManagers.map((manager) => (
            <span
              key={manager.id}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#0097B2]/25 bg-[#E0F7FA] py-1 pl-3 pr-1.5 text-xs font-semibold text-[#007A91]"
            >
              {manager.name}
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/80"
                onClick={() => toggleManager(manager.id)}
                aria-label={`Remove ${manager.name}`}
              >
                <X aria-hidden="true" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

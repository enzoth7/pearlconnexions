"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu, Popover } from "radix-ui";

export const hrFieldClass = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#102c39] focus-visible:outline-2 focus-visible:outline-teal-700";

export function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function hrDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export function HrFilterHeader({ id, label, value, options, type = "text", dark = false, onChange }: {
  id: string; label: string; value: string; options?: Array<string | { value: string; label: string }>; type?: "text" | "date" | "month"; dark?: boolean; onChange: (value: string) => void;
}) {
  const trigger = <button type="button" aria-label={`Filter ${label}`} className={`flex min-h-10 w-full min-w-0 items-center justify-between gap-2 text-left font-semibold ${dark ? "text-white" : value ? "text-teal-800" : "text-[#102c39]"}`}><div className="min-w-0 break-words">{label}{value ? " •" : ""}</div><ChevronDown size={15} className="shrink-0" aria-hidden /></button>;
  if (options) {
    const choices = options.map(item => typeof item === "string" ? { value: item, label: item } : item);
    return <DropdownMenu.Root><DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="start" sideOffset={2} className="z-[60] max-h-80 min-w-44 max-w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"><DropdownMenu.RadioGroup value={value || "__all__"} onValueChange={choice => onChange(choice === "__all__" ? "" : choice)}><DropdownMenu.RadioItem value="__all__" className="cursor-pointer rounded px-3 py-2 text-sm text-[#102c39] outline-none data-[highlighted]:bg-slate-100 data-[state=checked]:bg-teal-50 data-[state=checked]:font-semibold">All</DropdownMenu.RadioItem>{choices.map(item => <DropdownMenu.RadioItem key={item.value} value={item.value} className="cursor-pointer rounded px-3 py-2 text-sm text-[#102c39] outline-none data-[highlighted]:bg-slate-100 data-[state=checked]:bg-teal-50 data-[state=checked]:font-semibold">{item.label}</DropdownMenu.RadioItem>)}</DropdownMenu.RadioGroup></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
  }
  return <Popover.Root><Popover.Trigger asChild>{trigger}</Popover.Trigger><Popover.Portal><Popover.Content align="start" sideOffset={5} className="z-[60] w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"><label htmlFor={id} className="mb-2 block text-sm font-medium text-[#102c39]">Filter by {label.toLowerCase()}</label><input id={id} type={type} className={hrFieldClass} value={value} onChange={event => onChange(event.target.value)} />{value && <button type="button" className="mt-2 text-xs font-medium text-teal-800 underline" onClick={() => onChange("")}>Clear</button>}</Popover.Content></Popover.Portal></Popover.Root>;
}

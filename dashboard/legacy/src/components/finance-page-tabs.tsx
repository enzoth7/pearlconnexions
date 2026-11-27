"use client";

import { useState, type ReactNode } from "react";

/** A finance page with a heading and two or more views (for example monthly costs and individual expenses). */
export function FinancePageTabs({ title, description, tabs }: { title: string; description: string; tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold text-[#102c39]">{title}</h1><div className="mt-2 text-sm text-slate-600">{description}</div></div>
      <nav aria-label={`${title} views`} className="flex flex-wrap gap-2">{tabs.map(tab =>
        <button key={tab.id} type="button" aria-current={active === tab.id ? "page" : undefined} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${active === tab.id ? "bg-[#102c39] text-white" : "border border-slate-300 bg-white text-[#102c39]"}`} onClick={() => setActive(tab.id)}>{tab.label}</button>)}</nav>
    </header>
    {tabs.find(tab => tab.id === active)?.content}
  </div>;
}

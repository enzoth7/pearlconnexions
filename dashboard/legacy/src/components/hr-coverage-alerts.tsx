"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { londonToday } from "@/components/hr-register-controls";
import { supabase } from "../../../src/shims/supabase";

type Shift = {
  shift_on: string; shift_type: string; required_staff: number | null; planned_staff: number | null; present_staff: number | null;
  commissioned_support_hours: number | null; delivered_support_hours: number | null;
  commissioned_one_to_one_hours: number | null; delivered_one_to_one_hours: number | null;
  commissioned_two_to_one_hours: number | null; delivered_two_to_one_hours: number | null;
};

export function HrCoverageAlerts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.from("hr_coverage_shifts").select("*").then(result => {
      if (active) { setShifts((result.data ?? []) as Shift[]); setError(result.error?.message ?? ""); setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  const today = londonToday();
  const start = new Date(`${today}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - 30);
  const end = new Date(`${today}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 7);
  const relevant = shifts.filter(row => row.shift_on >= start.toISOString().slice(0, 10) && row.shift_on <= end.toISOString().slice(0, 10));
  const past = relevant.filter(row => row.shift_on <= today);
  const countShort = (row: Shift) => {
    const count = row.shift_on <= today ? row.present_staff : row.planned_staff;
    return row.required_staff !== null && count !== null && count < row.required_staff;
  };
  const short = relevant.filter(countShort);
  const uncoveredNight = relevant.filter(row => row.shift_type === "Waking night" && row.required_staff !== null && row.required_staff > 0 &&
    (row.shift_on <= today ? row.present_staff === 0 : row.planned_staff === 0));
  const shortfall = (expected: keyof Shift, delivered: keyof Shift) => {
    const paired = past.filter(row => typeof row[expected] === "number" && typeof row[delivered] === "number");
    const amount = paired.reduce((sum, row) => sum + Math.max(0, Number(row[expected]) - Number(row[delivered])), 0);
    return { amount, pending: past.length - paired.length };
  };
  const support = shortfall("commissioned_support_hours", "delivered_support_hours");
  const oneToOne = shortfall("commissioned_one_to_one_hours", "delivered_one_to_one_hours");
  const twoToOne = shortfall("commissioned_two_to_one_hours", "delivered_two_to_one_hours");
  const incomplete = relevant.filter(row => row.required_staff == null || (row.shift_on <= today ? row.present_staff == null : row.planned_staff == null)).length;
  const hours = (value: number) => `${Math.round(value * 100) / 100} h`;
  const shownHours = (item: { amount: number; pending: number }) => item.pending === past.length ? "Pending" : `${hours(item.amount)}${item.pending ? " + pending" : ""}`;
  const alerts = [
    { label: "Short staffed shifts", value: String(short.length), hot: short.length > 0 },
    { label: "Uncovered waking nights", value: String(uncoveredNight.length), hot: uncoveredNight.length > 0 },
    { label: "Support hours not delivered", value: shownHours(support), hot: support.amount > 0, pending: support.pending > 0 },
    { label: "1:1 hours not delivered", value: shownHours(oneToOne), hot: oneToOne.amount > 0, pending: oneToOne.pending > 0 },
    { label: "2:1 hours not delivered", value: shownHours(twoToOne), hot: twoToOne.amount > 0, pending: twoToOne.pending > 0 },
  ];
  return <section className="overflow-hidden rounded-3xl border border-[#dce5e2] bg-white shadow-sm">
    <div className="bg-[#102c39] px-6 py-5 text-white"><h2 className="text-xl font-bold">Coverage alerts</h2><div className="mt-1 text-sm">Last 30 days and next 7 days</div></div>
    {loading ? <div className="p-6 text-sm text-slate-600">Loading coverage…</div> : error ? <div role="alert" className="p-6 text-sm text-rose-800">{error}</div> : !relevant.length ? <div className="p-6 text-sm text-slate-600">No shifts recorded for this period.</div> : <>
      <div className="divide-y divide-slate-200 px-6">{alerts.map(item => <Link key={item.label} href="/hr/coverage" className="flex min-h-14 items-center justify-between gap-3 py-3 text-sm text-[#102c39] hover:text-teal-800"><div>{item.label}</div><strong className={`rounded-full px-3 py-1 text-xs ${item.hot ? "bg-rose-100 text-rose-900" : "pending" in item && item.pending ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{item.value}</strong></Link>)}</div>
      {incomplete > 0 && <div className="border-t border-slate-200 px-6 py-3 text-sm text-amber-800">{incomplete} {incomplete === 1 ? "shift has" : "shifts have"} staffing numbers pending.</div>}
    </>}
  </section>;
}

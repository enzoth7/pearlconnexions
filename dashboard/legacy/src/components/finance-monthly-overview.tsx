"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { gbp, monthLabel } from "@/lib/finance-invoices";
import { monthChoices, monthStart, shiftMonth, summariseMonth, type CostLine, type MonthHome, type MonthInvoice, type PayrollEntry } from "@/lib/finance-monthly";
import { supabase } from "../../../src/shims/supabase";

type Settings = { id: string; version: number; monthly_expense_budget_gbp: number };
const alertTone = { red: "bg-rose-100 text-rose-900", amber: "bg-amber-100 text-amber-900", sky: "bg-sky-100 text-sky-900" };

/** One month at a glance: council income, running costs and staff pay per house, and what needs attention. */
export function FinanceMonthlyOverview() {
  const today = londonToday();
  const [month, setMonth] = useState(monthStart(today));
  const [data, setData] = useState<{ homes: MonthHome[]; costs: CostLine[]; previousCosts: CostLine[]; payroll: PayrollEntry[]; invoices: MonthInvoice[]; months: string[] }>({ homes: [], costs: [], previousCosts: [], payroll: [], invoices: [], months: [] });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [director, setDirector] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const [homes, costs, previousCosts, payroll, invoices, costMonths, payMonths, details, profile] = await Promise.all([
      supabase.from("qa_homes").select("id,name,active").order("name"),
      supabase.from("finance_cost_lines").select("*").eq("period_month", month),
      supabase.from("finance_cost_lines").select("*").eq("period_month", shiftMonth(month, -1)),
      supabase.from("finance_payroll_entries").select("*").eq("period_month", month),
      supabase.from("finance_invoices").select("home_id,period_month,amount_gbp,received_gbp,due_on,status").eq("period_month", month),
      supabase.from("finance_cost_lines").select("period_month"),
      supabase.from("finance_payroll_entries").select("period_month"),
      supabase.from("finance_settings").select("id,version,monthly_expense_budget_gbp").maybeSingle(),
      auth.user ? supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const months = [...((costMonths.data ?? []) as { period_month: string }[]), ...((payMonths.data ?? []) as { period_month: string }[])].map(row => row.period_month);
    setData({
      homes: (homes.data ?? []) as MonthHome[], costs: (costs.data ?? []) as CostLine[], previousCosts: (previousCosts.data ?? []) as CostLine[],
      payroll: (payroll.data ?? []) as PayrollEntry[], invoices: (invoices.data ?? []) as MonthInvoice[], months,
    });
    setSettings((details.data ?? null) as Settings | null);
    setDirector((profile.data as { role?: string } | null)?.role === "director");
    setError(costs.error?.message ?? payroll.error?.message ?? invoices.error?.message ?? "");
    setLoading(false);
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  const budget = Number(settings?.monthly_expense_budget_gbp ?? 0);
  const summary = useMemo(() => summariseMonth({ month, budget, today, ...data }), [month, budget, today, data]);
  const { totals } = summary;

  async function saveBudget() {
    if (!settings || budgetDraft === null) return;
    if (!/^\d+(\.\d{1,2})?$/.test(budgetDraft.trim())) { setError("Enter the budget in pounds."); return; }
    const result = await supabase.from("finance_settings").update({ monthly_expense_budget_gbp: Number(budgetDraft), version: settings.version + 1 }).eq("id", settings.id).eq("version", settings.version).select("id").maybeSingle();
    if (result.error || !result.data) { setError(result.error?.message ?? "The budget changed. Reload the page."); return; }
    setBudgetDraft(null);
    await load();
  }

  const kpis = [
    { label: "Invoiced to councils", value: gbp.format(totals.income), note: totals.outstanding ? `${gbp.format(totals.outstanding)} still to collect` : "All collected", href: "/finance/invoices" },
    { label: "Running costs", value: gbp.format(totals.running), note: budget ? `${Math.round((totals.running / budget) * 100)}% of the ${gbp.format(budget)} budget` : "No budget set", href: "/finance/expenses", warn: budget > 0 && totals.running > budget },
    { label: "Staff pay", value: gbp.format(totals.staff), note: `${data.payroll.length} ${data.payroll.length === 1 ? "person" : "people"}`, href: "/finance/payroll" },
    { label: "Margin (indicative)", value: gbp.format(totals.margin), note: "Invoiced less running costs and staff pay", warn: totals.margin < 0 },
  ];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold text-[#102c39]">Finance</h1><div className="mt-2 text-sm text-slate-600">{monthLabel(month)} by house: what was invoiced, what it cost and what is left.</div></div>
      <MaintenanceSelectField name="overview-month" label="Month" value={month} options={monthChoices(data.months, today).map(value => ({ value, label: monthLabel(value) }))} onChange={setMonth} className="w-56" />
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}

    <section aria-label="Month totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(item => {
      const content = <>
        <div className="text-sm font-semibold text-slate-600">{item.label}</div>
        <strong className={`mt-3 block text-3xl font-semibold tabular-nums ${item.warn ? "text-rose-800" : "text-[#102c39]"}`}>{loading ? "…" : item.value}</strong>
        <small className="mt-2 block text-sm text-slate-600">{item.note}</small>
      </>;
      return item.href ? <Link key={item.label} href={item.href} className="workspace-kpi-link rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400">{content}</Link> : <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5">{content}</div>;
    })}</section>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section aria-label="By house" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="bg-[#102c39] px-5 py-4 text-white"><h2 className="text-lg font-semibold">By house</h2><div className="mt-1 text-sm text-slate-200">Staff pay follows how each person's pay is shared between houses.</div></div>
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Income, costs and margin by house for {monthLabel(month)}</caption>
          <thead className="bg-[#102c39] text-white"><tr>
            <th scope="col" className="px-4 py-2 font-semibold">House</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Invoiced</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-semibold md:table-cell">Running</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-semibold md:table-cell">Staff</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Margin</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-200">{summary.houses.map(row => <tr key={row.key}>
            <td className="px-4 py-3 font-semibold text-[#102c39]">{row.name}{!row.active && <strong className="ml-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">Inactive</strong>}</td>
            <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{row.income ? gbp.format(row.income) : "—"}</td>
            <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">{gbp.format(row.runningTotal)}</td>
            <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">{gbp.format(row.staff)}</td>
            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.margin < 0 ? "text-rose-800" : "text-[#102c39]"}`}>{gbp.format(row.margin)}</td>
          </tr>)}</tbody>
          <tfoot className="bg-slate-50"><tr>
            <th scope="row" className="px-4 py-3 font-semibold text-[#102c39]">Total</th>
            <td className="hidden px-3 py-3 text-right font-semibold tabular-nums sm:table-cell">{gbp.format(totals.income)}</td>
            <td className="hidden px-3 py-3 text-right font-semibold tabular-nums md:table-cell">{gbp.format(totals.running)}</td>
            <td className="hidden px-3 py-3 text-right font-semibold tabular-nums md:table-cell">{gbp.format(totals.staff)}</td>
            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${totals.margin < 0 ? "text-rose-800" : "text-[#102c39]"}`}>{gbp.format(totals.margin)}</td>
          </tr></tfoot>
        </table>
      </section>

      <div className="space-y-6">
        <section aria-label="What needs attention" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="bg-[#102c39] px-5 py-4 text-white"><h2 className="text-lg font-semibold">What needs attention</h2></div>
          {summary.alerts.length ? <ul className="divide-y divide-slate-200">{summary.alerts.map(alert => <li key={alert.label}><Link href={alert.href} className="block px-5 py-3 hover:bg-slate-50">
            <strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${alertTone[alert.tone]}`}>{alert.label}</strong>
            <small className="mt-1 block text-sm text-slate-700">{alert.detail}</small>
          </Link></li>)}</ul> : <div className="px-5 py-6 text-sm text-slate-600">{loading ? "Loading…" : "Nothing needs attention this month."}</div>}
        </section>

        <section aria-label="Monthly budget" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-[#102c39]">Monthly budget for running costs</h2>
          {budgetDraft === null
            ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><strong className="text-2xl font-semibold tabular-nums text-[#102c39]">{budget ? gbp.format(budget) : "Not set"}</strong>{director && settings && <button type="button" className="min-h-11 text-sm font-semibold text-teal-800 underline" onClick={() => setBudgetDraft(String(budget))}>Change</button>}</div>
            : <div className="mt-2 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Budget (£)<input type="number" min="0" step="1" className={hrFieldClass} value={budgetDraft} onChange={event => setBudgetDraft(event.target.value)} /></label>
              <button type="button" className="inline-flex min-h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white" onClick={() => void saveBudget()}>Save</button>
              <button type="button" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-teal-800" onClick={() => setBudgetDraft(null)}>Cancel</button></div>}
          {!director && <small className="mt-2 block text-xs text-slate-600">Only the director can change the budget.</small>}
        </section>
      </div>
    </div>
  </div>;
}

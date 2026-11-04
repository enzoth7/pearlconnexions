"use client";

import { Banknote, CirclePoundSterling, Landmark, PiggyBank, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { londonToday } from "@/components/hr-register-controls";
import { supabase } from "../../../src/shims/supabase";

type Expense = { expense_on: string; category: string; amount_gbp: number };
type Payroll = { period_month: string; actual_amount_gbp: number | null };
type Invoice = { issued_on: string; amount_gbp: number; received_gbp: number };
type Registers = { expenses: Expense[]; payroll: Payroll[]; invoices: Invoice[] };

const pounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const sum = <T,>(items: T[], amount: (item: T) => number) => items.reduce((total, item) => total + amount(item), 0);
const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const moneyOrDash = (amount: number, hasRecords: boolean) => hasRecords ? pounds.format(amount) : "—";
const kpiColors = { green: "#087e65", blue: "#176b93", violet: "#7053a0", amber: "#a15d18" };

function FinanceKpi({ label, value, icon: Icon, tone, share, href }: {
  label: string; value: string; icon: LucideIcon; tone: keyof typeof kpiColors; share: number | null; href?: string;
}) {
  const content = <>
    <div className="flex items-start justify-between gap-3 text-sm font-semibold text-slate-700">
      <div>{label}</div><Icon size={20} color={kpiColors[tone]} className="shrink-0" aria-hidden="true" />
    </div>
    <div className="mt-5 text-[clamp(1.8rem,2.2vw,2.5rem)] leading-none font-semibold tracking-[-.045em] tabular-nums text-[#102c39]">{value}</div>
    <div className="mt-auto pt-5">
      <div className="metric-segments !mt-0" role={share === null ? undefined : "img"} aria-label={share === null ? undefined : `${Math.round(share)}% of invoiced total`} aria-hidden={share === null ? true : undefined}>
        {share !== null && <i style={{ width: `${Math.min(100, Math.max(0, share))}%`, backgroundColor: kpiColors[tone] }} />}
      </div>
    </div>
  </>;
  const className = "flex min-h-44 min-w-0 flex-col rounded-2xl border border-[#dce5e2] bg-white p-5 sm:p-6";
  return href ? <Link href={href} className={className + " hover:border-teal-600"}>{content}</Link> : <div className={className}>{content}</div>;
}

export function FinanceOverview() {
  const [registers, setRegisters] = useState<Registers>({ expenses: [], payroll: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const [expenses, payroll, invoices] = await Promise.all([
        supabase.from("finance_expenses").select("expense_on,category,amount_gbp"),
        supabase.from("finance_payroll_periods").select("period_month,actual_amount_gbp"),
        supabase.from("finance_invoices").select("issued_on,amount_gbp,received_gbp"),
      ]);
      if (!active) return;
      setRegisters({ expenses: (expenses.data ?? []) as Expense[], payroll: (payroll.data ?? []) as Payroll[], invoices: (invoices.data ?? []) as Invoice[] });
      setError(expenses.error?.message ?? payroll.error?.message ?? invoices.error?.message ?? "");
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const view = useMemo(() => {
    const today = londonToday();
    const year = today.slice(0, 4);
    const yearExpenses = registers.expenses.filter(item => item.expense_on.startsWith(year));
    const yearPayroll = registers.payroll.filter(item => item.period_month.startsWith(year) && item.actual_amount_gbp !== null);
    const hasPendingPayroll = registers.payroll.some(item => item.period_month.startsWith(year) && item.actual_amount_gbp === null);
    const yearInvoices = registers.invoices.filter(item => item.issued_on.startsWith(year));
    const invoiced = sum(yearInvoices, item => Number(item.amount_gbp));
    const expenditure = sum(yearExpenses, item => Number(item.amount_gbp)) + sum(yearPayroll, item => Number(item.actual_amount_gbp));
    const outstanding = sum(yearInvoices, item => Math.max(0, Number(item.amount_gbp) - Number(item.received_gbp)));
    const months = Array.from({ length: 3 }, (_, offset) => {
      const date = new Date(Date.UTC(Number(year), Number(today.slice(5, 7)) - 1 - (2 - offset), 1));
      const key = date.toISOString().slice(0, 7);
      const monthInvoices = registers.invoices.filter(item => item.issued_on.startsWith(key));
      const monthExpenses = registers.expenses.filter(item => item.expense_on.startsWith(key));
      const monthPayroll = registers.payroll.filter(item => item.period_month.startsWith(key) && item.actual_amount_gbp !== null);
      const hasPendingPayroll = registers.payroll.some(item => item.period_month.startsWith(key) && item.actual_amount_gbp === null);
      const billed = sum(monthInvoices, item => Number(item.amount_gbp));
      const costs = sum(monthExpenses, item => Number(item.amount_gbp)) + sum(monthPayroll, item => Number(item.actual_amount_gbp));
      return { key, billed, costs, hasInvoices: monthInvoices.length > 0, hasCosts: monthExpenses.length > 0 || monthPayroll.length > 0, hasPendingPayroll };
    });
    const grouped = new Map<string, number>();
    for (const item of yearExpenses) grouped.set(item.category, (grouped.get(item.category) ?? 0) + Number(item.amount_gbp));
    if (yearPayroll.length) grouped.set("Staffing", (grouped.get("Staffing") ?? 0) + sum(yearPayroll, item => Number(item.actual_amount_gbp)));
    const categories = [...grouped.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, share: expenditure > 0 ? value / expenditure * 100 : 0 }));
    return { invoiced, expenditure, outstanding, yearInvoices, yearExpenses, yearPayroll, hasPendingPayroll, months, categories };
  }, [registers]);

  return <div className="space-y-5">
    <PageHeader title="Finance overview" description="Invoicing, recorded costs and payroll across the workspace." />
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    <section aria-label="Finance indicators">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceKpi label="Invoiced" value={loading ? "…" : moneyOrDash(view.invoiced, view.yearInvoices.length > 0)} icon={CirclePoundSterling} tone="green" share={view.yearInvoices.length ? 100 : null} href="/finance/invoices" />
        <FinanceKpi label="Recorded expenditure" value={loading ? "…" : moneyOrDash(view.expenditure, view.yearExpenses.length > 0 || view.yearPayroll.length > 0)} icon={Banknote} tone="blue" share={view.invoiced > 0 && (view.yearExpenses.length > 0 || view.yearPayroll.length > 0) ? view.expenditure / view.invoiced * 100 : null} href="/finance/expenses" />
        <FinanceKpi label="Invoiced less costs" value={loading ? "…" : view.hasPendingPayroll ? "Pending" : moneyOrDash(view.invoiced - view.expenditure, view.yearInvoices.length > 0 && (view.yearExpenses.length > 0 || view.yearPayroll.length > 0))} icon={Landmark} tone="violet" share={view.hasPendingPayroll ? null : view.invoiced > 0 && (view.yearExpenses.length > 0 || view.yearPayroll.length > 0) ? (view.invoiced - view.expenditure) / view.invoiced * 100 : null} />
        <FinanceKpi label="Outstanding invoices" value={loading ? "…" : moneyOrDash(view.outstanding, view.yearInvoices.length > 0)} icon={PiggyBank} tone="amber" share={view.invoiced > 0 ? view.outstanding / view.invoiced * 100 : null} href="/finance/invoices" />
      </div>
    </section>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dce5e2] bg-white" aria-labelledby="monthly-position">
        <div className="border-b border-slate-200 px-5 py-4"><h2 id="monthly-position" className="font-bold text-[#102c39]">Monthly position</h2><div className="mt-1 text-sm text-slate-600">Invoices issued and costs recorded by month.</div></div>
        <table className="w-full table-fixed text-sm"><thead><tr className="text-left text-[#102c39]"><th scope="col" className="px-3 py-3">Month</th><th scope="col" className="px-3 py-3 text-right">Invoiced</th><th scope="col" className="px-3 py-3 text-right">Costs</th><th scope="col" className="px-3 py-3 text-right">Difference</th></tr></thead><tbody className="divide-y divide-slate-200">{view.months.map(month => <tr key={month.key}><th scope="row" className="px-3 py-3 text-left font-semibold text-[#102c39]">{monthName(month.key)}</th><td className="px-3 py-3 text-right">{moneyOrDash(month.billed, month.hasInvoices)}</td><td className="px-3 py-3 text-right">{moneyOrDash(month.costs, month.hasCosts)}</td><td className="px-3 py-3 text-right font-semibold">{month.hasPendingPayroll ? "Pending" : moneyOrDash(month.billed - month.costs, month.hasInvoices && month.hasCosts)}</td></tr>)}</tbody></table>
      </section>
      <section className="min-w-0 rounded-2xl border border-[#dce5e2] bg-white" aria-labelledby="spend-categories">
        <div className="border-b border-slate-200 px-5 py-4"><h2 id="spend-categories" className="font-bold text-[#102c39]">Where costs go</h2><div className="mt-1 text-sm text-slate-600">Recorded expenses and payroll this year.</div></div>
        <div className="space-y-4 p-5">{view.categories.length ? view.categories.map(item => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><strong className="text-[#102c39]">{item.label}</strong><strong className="text-[#102c39]">{pounds.format(item.value)} · {Math.round(item.share)}%</strong></div><Progress value={item.share} className="h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-teal-700" /></div>) : <div className="text-sm text-slate-600">No costs recorded yet.</div>}</div>
      </section>
    </div>
  </div>;
}

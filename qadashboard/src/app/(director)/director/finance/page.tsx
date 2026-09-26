import { Banknote, CirclePoundSterling, Landmark, PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const months = [
  { month: "July 2026", income: "£57,800", expenditure: "£49,450", balance: "£8,350" },
  { month: "August 2026", income: "£61,200", expenditure: "£50,910", balance: "£10,290" },
  { month: "September 2026", income: "£65,250", expenditure: "£51,520", balance: "£13,730" },
];

const budget = [
  { label: "Staffing", share: 68, value: "£103,278" },
  { label: "Property & utilities", share: 17, value: "£25,820" },
  { label: "Operations", share: 10, value: "£15,188" },
  { label: "Training", share: 5, value: "£7,594" },
];

export default function FinancePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finance"
        title="Finance overview"
        description="A lightweight sample of the financial visibility that could be added to the Pearl Connexions workspace."
        action={<Badge variant="outline" className="border-amber-300 bg-amber-50 px-3 py-1 text-amber-800">Demo data</Badge>}
      />

      <section aria-labelledby="finance-kpis">
        <h2 id="finance-kpis" className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#17345f]">Illustrative year-to-date position</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Income" value="£184,250" note="Illustrative YTD total" icon={CirclePoundSterling} tone="green" progress={92} />
          <KpiCard label="Expenditure" value="£151,880" note="82% of sample budget" icon={Banknote} tone="blue" progress={82} />
          <KpiCard label="Operating balance" value="£32,370" note="Income less expenditure" icon={Landmark} tone="violet" progress={64} />
          <KpiCard label="Available budget" value="£33,120" note="18% remaining" icon={PiggyBank} tone="amber" progress={18} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="font-bold text-[#102a52]">Monthly position</CardTitle>
            <CardDescription>Simple comparison of sample income, expenditure and balance.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader className="bg-slate-50/90">
                <TableRow>
                  <TableHead className="ps-4">Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenditure</TableHead>
                  <TableHead className="pe-4 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="ps-4 font-bold text-[#17345f]">{month.month}</TableCell>
                    <TableCell className="text-right font-semibold">{month.income}</TableCell>
                    <TableCell className="text-right">{month.expenditure}</TableCell>
                    <TableCell className="pe-4 text-right font-extrabold text-emerald-700">{month.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="font-bold text-[#102a52]">Where the budget goes</CardTitle>
            <CardDescription>Illustrative split of the sample expenditure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budget.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-extrabold text-[#102a52]">{item.value} · {item.share}%</span>
                </div>
                <Progress value={item.share} className="h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-blue-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

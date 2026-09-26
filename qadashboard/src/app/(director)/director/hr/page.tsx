import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const staff = [
  { name: "Aisha Morgan", role: "Registered Manager", service: "Pearl House", contract: "Full time", start: "14 Mar 2022", training: 100, absence: 0, dbs: "18 Jan 2027", status: "Active" },
  { name: "Daniel Reed", role: "Senior Support Worker", service: "Maple Lodge", contract: "Full time", start: "06 Nov 2023", training: 92, absence: 1, dbs: "02 Dec 2026", status: "Active" },
  { name: "Maya Thompson", role: "Support Worker", service: "Pearl House", contract: "Full time", start: "22 Jan 2024", training: 83, absence: 2, dbs: "11 Nov 2026", status: "Review due" },
  { name: "Owen Clarke", role: "Key Worker", service: "Cedar View", contract: "Part time", start: "09 Sep 2024", training: 100, absence: 0, dbs: "27 Apr 2027", status: "Active" },
  { name: "Leila Patel", role: "Support Worker", service: "Maple Lodge", contract: "Full time", start: "17 Feb 2025", training: 75, absence: 3, dbs: "05 Nov 2026", status: "Action needed" },
  { name: "Noah Williams", role: "Support Worker", service: "Cedar View", contract: "Bank", start: "01 Sep 2026", training: 58, absence: 0, dbs: "30 Aug 2027", status: "Onboarding" },
];

const recruitment = [
  { label: "Applications received", value: 12, progress: 100 },
  { label: "Shortlisted", value: 7, progress: 58 },
  { label: "Interviews booked", value: 5, progress: 42 },
  { label: "Offers pending", value: 2, progress: 17 },
];

function statusStyle(status: string) {
  if (status === "Active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Onboarding") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Review due") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-700";
}

export default function HrPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="HR"
        title="Human Resources overview"
        description="A sample people-operations view for monitoring staffing, compliance and workforce actions across Pearl Connexions."
        action={<Badge variant="outline" className="border-amber-300 bg-amber-50 px-3 py-1 text-amber-800">Demo data</Badge>}
      />

      <section aria-labelledby="hr-kpis">
        <h2 id="hr-kpis" className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#17345f]">Workforce snapshot</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active employees" value="42" note="Across all services" icon={UsersRound} tone="blue" progress={84} />
          <KpiCard label="Training current" value="87%" note="Mandatory learning complete" icon={GraduationCap} tone="green" progress={87} />
          <KpiCard label="Open vacancies" value="3" note="Two support, one senior role" icon={BriefcaseBusiness} tone="amber" progress={60} />
          <KpiCard label="Absence rate" value="2.8%" note="Illustrative current month" icon={CalendarClock} tone="violet" progress={28} />
        </div>
      </section>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 font-bold text-[#102a52]">
            <UsersRound className="size-5 text-blue-700" aria-hidden="true" />
            Workforce register
          </CardTitle>
          <CardDescription>Illustrative staff records showing the variables that could be managed here. Names and figures are fictional.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader className="bg-slate-50/90">
              <TableRow>
                <TableHead className="min-w-40 ps-4">Employee</TableHead>
                <TableHead className="min-w-44">Role</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Start date</TableHead>
                <TableHead>Training</TableHead>
                <TableHead className="text-center">Absence days</TableHead>
                <TableHead>DBS renewal</TableHead>
                <TableHead className="pe-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((employee) => (
                <TableRow key={employee.name}>
                  <TableCell className="ps-4 font-bold text-[#17345f]">{employee.name}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell>{employee.service}</TableCell>
                  <TableCell>{employee.contract}</TableCell>
                  <TableCell>{employee.start}</TableCell>
                  <TableCell>
                    <div className="flex min-w-28 items-center gap-2">
                      <Progress value={employee.training} className="h-1.5 bg-slate-200 [&_[data-slot=progress-indicator]]:bg-blue-600" aria-label={`${employee.training}% training complete`} />
                      <span className="w-8 text-right text-xs font-bold text-slate-600">{employee.training}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{employee.absence}</TableCell>
                  <TableCell>{employee.dbs}</TableCell>
                  <TableCell className="pe-4"><Badge variant="outline" className={statusStyle(employee.status)}>{employee.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-[#102a52]"><UserPlus className="size-5 text-blue-700" aria-hidden="true" />Recruitment pipeline</CardTitle>
            <CardDescription>Example view of candidates moving through recruitment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recruitment.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-extrabold text-[#102a52]">{item.value}</span>
                </div>
                <Progress value={item.progress} className="h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-blue-600" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-[#102a52]"><CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />People actions</CardTitle>
            <CardDescription>Items that could require HR follow-up.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-200">
              <li className="flex items-center justify-between gap-4 py-3"><span className="font-semibold text-slate-700">Training modules due within 30 days</span><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">4 people</Badge></li>
              <li className="flex items-center justify-between gap-4 py-3"><span className="font-semibold text-slate-700">DBS renewals within 60 days</span><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">2 people</Badge></li>
              <li className="flex items-center justify-between gap-4 py-3"><span className="font-semibold text-slate-700">Probation reviews this month</span><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">3 people</Badge></li>
              <li className="flex items-center justify-between gap-4 py-3"><span className="font-semibold text-slate-700">Open return-to-work forms</span><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">1 person</Badge></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

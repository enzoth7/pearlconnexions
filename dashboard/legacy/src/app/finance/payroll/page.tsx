import { FinancePageTabs } from "@/components/finance-page-tabs";
import { FinancePayrollChecklist } from "@/components/finance-payroll-checklist";
import { FinanceRegisterWorkspace } from "@/components/finance-register-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.payroll");
  return <FinancePageTabs title="Payroll" description="Who has sent an invoice and timesheet, what each person is paid and how it is shared between houses." tabs={[
    { id: "staff", label: "Staff checklist", content: <FinancePayrollChecklist /> },
    { id: "totals", label: "Monthly totals", content: <FinanceRegisterWorkspace mode="payroll" embedded /> },
  ]} />;
}

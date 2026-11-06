import { FinanceRegisterWorkspace } from "@/components/finance-register-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.payroll");
  return <FinanceRegisterWorkspace mode="payroll" />;
}

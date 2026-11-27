import { FinanceCostLines } from "@/components/finance-cost-lines";
import { FinancePageTabs } from "@/components/finance-page-tabs";
import { FinanceRegisterWorkspace } from "@/components/finance-register-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.expenses");
  return <FinancePageTabs title="Expenses" description="Running costs per house each month, and individual expenses with their receipts." tabs={[
    { id: "monthly", label: "Monthly costs", content: <FinanceCostLines /> },
    { id: "individual", label: "Individual expenses", content: <FinanceRegisterWorkspace mode="expenses" embedded /> },
  ]} />;
}

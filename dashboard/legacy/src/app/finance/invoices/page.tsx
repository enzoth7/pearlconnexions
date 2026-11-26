import { FinanceInvoicesWorkspace } from "@/components/finance-invoices-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.invoices");
  return <FinanceInvoicesWorkspace />;
}

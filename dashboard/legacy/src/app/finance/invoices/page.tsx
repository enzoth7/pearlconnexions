import { FinanceRegisterWorkspace } from "@/components/finance-register-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.overview");
  return <FinanceRegisterWorkspace mode="invoices" />;
}

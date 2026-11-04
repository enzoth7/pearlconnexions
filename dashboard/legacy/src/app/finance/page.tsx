import { FinanceOverview } from "@/components/finance-overview";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.overview");
  return <FinanceOverview />;
}

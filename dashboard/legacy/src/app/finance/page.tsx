import { FinanceMonthlyOverview } from "@/components/finance-monthly-overview";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("finance.overview");
  return <FinanceMonthlyOverview />;
}

import { MaintenanceIssues } from "@/components/maintenance-workspace";
import { loadCases } from "@/lib/qa-cases-client";

export default async function Page() {
  return <MaintenanceIssues {...await loadCases("maintenance")} historical />;
}

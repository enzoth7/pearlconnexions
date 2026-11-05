import { MaintenanceSafetyChecks } from "@/components/maintenance-safety-checks";
import { loadCases } from "@/lib/qa-cases-client";

export default async function Page() {
  const { homes, canManageMaintenance } = await loadCases("maintenance");
  return <MaintenanceSafetyChecks homes={homes} canManageMaintenance={canManageMaintenance} />;
}

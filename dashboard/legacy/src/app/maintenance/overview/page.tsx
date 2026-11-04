import { MaintenanceOverview } from "@/components/maintenance-workspace";
import { loadCases } from "@/lib/qa-cases-client";
export default async function Page() { return <MaintenanceOverview {...await loadCases("maintenance")} />; }

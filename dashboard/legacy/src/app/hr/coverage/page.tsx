import { HrCoverageWorkspace } from "@/components/hr-coverage-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  await requireSection("hr.overview");
  return <HrCoverageWorkspace />;
}

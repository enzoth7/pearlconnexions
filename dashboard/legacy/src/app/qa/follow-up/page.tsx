import { QaFollowUp } from "@/components/qa-follow-up";
import { requireGovernance } from "@/lib/auth";
import { loadCases } from "@/lib/qa-cases-client";
import { canOpenSection } from "@/lib/workspace-sections";

export default async function Page() {
  const { context } = await requireGovernance("qa", "qa.follow_up");
  const [incidents, risks] = await Promise.all([
    loadCases("incidents", "qa.follow_up"),
    loadCases("risks", "qa.follow_up"),
  ]);
  const homes = [...new Map([...(incidents?.homes ?? []), ...(risks?.homes ?? [])].map(home => [home.id, home])).values()];
  const allowedHomes = new Set(homes.map(home => home.id));
  const records = [...(incidents?.records ?? []), ...(risks?.records ?? [])].filter(record => allowedHomes.has(record.home_id));
  return <QaFollowUp homes={homes} records={records} canOpenIncidents={canOpenSection(context, "qa.incidents")} canOpenRisks={canOpenSection(context, "qa.risks")} />;
}

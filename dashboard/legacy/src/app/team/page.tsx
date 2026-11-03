import { requireGovernance } from "@/lib/auth";
import { OrganisationChart } from "@/components/organisation-chart";

export default async function TeamPage() {
  const { supabase } = await requireGovernance("team");
  const result = await supabase.rpc("team_chart_people");
  if (result.error) throw new Error(result.error.message);
  return <OrganisationChart people={result.data ?? []} />;
}

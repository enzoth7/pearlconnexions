import { requireGovernance } from "@/lib/auth";
import { OrganisationChart } from "@/components/organisation-chart";

export default async function TeamPage() {
  const { supabase } = await requireGovernance("team");
  const [result, homes] = await Promise.all([supabase.rpc("team_chart_people"), supabase.rpc("team_chart_homes")]);
  if (result.error) throw new Error(result.error.message);
  // Without house data the chart still renders; house managers then fall back to their role title.
  return <OrganisationChart people={result.data ?? []} homes={homes.error ? [] : homes.data ?? []} />;
}

import { ConfigHouses } from "@/components/config-houses";
import { requireSection } from "@/lib/auth";
import type { Home } from "@/lib/types";

export default async function HousesPage() {
  const { context, supabase } = await requireSection("settings.houses");
  const result = await supabase.from("qa_homes").select("id,code,name,address,provision,total_beds,active").order("name");
  if (result.error) throw new Error(result.error.message);
  return <div className="space-y-7">
    <header>
      <h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#102c39]">Houses</h1>
      <div className="mt-2 text-sm text-slate-600">Manage the houses available across Quality and Governance.</div>
    </header>
    <ConfigHouses houses={result.data as Home[]} canEdit={context.role === "director" && context.isAdmin} />
  </div>;
}

import { requireGovernance } from "@/lib/auth";
import type { Home } from "@/lib/types";
import type { GovernanceRecord, RecordKind } from "@/lib/governance";
import { localRecords } from "@/lib/qa-local-fixtures";

export async function loadRegister(kind: RecordKind) {
  const { context, supabase } = await requireGovernance(kind === "maintenance" ? "maintenance" : "qa", kind === "maintenance" ? "maintenance.issues" : `qa.${kind}`);
  const [homes, records] = await Promise.all([
    supabase.from("qa_homes").select("*").eq("active", true).order("name"),
    supabase.from("qa_records").select("*").eq("kind", kind).order("occurred_on", { ascending: false }),
  ]);
  if (homes.error || records.error) throw new Error(homes.error?.message || records.error?.message);
  const scopedHomes = (homes.data as Home[]).filter(home => context.role === "director" || (kind === "maintenance" && context.managesMaintenance) || context.homes.some(assigned => assigned.id === home.id));
  return { context, homes: scopedHomes, records: [...localRecords(kind, scopedHomes), ...records.data as GovernanceRecord[]] };
}

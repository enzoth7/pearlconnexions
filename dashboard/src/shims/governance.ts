import { z } from "zod";
import { supabase } from "./supabase";
import { getAccessContext } from "./auth";
import { canOpenSection } from "@/lib/workspace-sections";
import { recordSchema, reportBodySchema } from "../../legacy/src/lib/governance";
export { recordLabels, recordStates, recordKinds, recordSchema, reportBodySchema, checklistScore, reportErrors } from "../../legacy/src/lib/governance";
export type { GovernanceRecord, RecordKind, ReportBody, Question, Answer } from "../../legacy/src/lib/governance";
type SaveResult = { ok: boolean; message: string; version?: number; id?: string };
export async function saveGovernance(_endpoint: string, input: unknown): Promise<SaveResult> {
  try {
  const context = await getAccessContext();
  if (!context) return { ok: false, message: "Sign in again to save changes." };
  const value = input as { operation?: string; record?: unknown; home?: unknown; id?: string; version?: number; body?: unknown; reason?: string };
  if (value.operation === "home") {
    if (context.role !== "director") return { ok: false, message: "Director access required." };
    const parsed = z.object({ id: z.uuid(), name: z.string().trim().min(2).max(120), provision: z.enum(["Children's Home", "Supported Living", "Supported Accommodation"]), total_beds: z.number().int().nonnegative().nullable(), active: z.boolean() }).safeParse(value.home);
    if (!parsed.success) return { ok: false, message: "Check the home details." };
    const { id, ...fields } = parsed.data;
    const result = await supabase.from("qa_homes").update(fields).eq("id", id).select("id").maybeSingle();
    return result.error || !result.data ? { ok: false, message: result.error?.message || "Home unavailable." } : { ok: true, message: "Home saved." };
  }
  if (value.operation === "record") {
    const parsed = recordSchema.safeParse(value.record);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
    const { id, version, ...record } = parsed.data;
    const section = record.kind === "maintenance" ? "maintenance.issues" : `qa.${record.kind}` as const;
    if (!canOpenSection(context, section) || (context.role !== "director" && !(record.kind === "maintenance" && context.managesMaintenance) && !context.homes.some(home => home.id === record.home_id))) {
      return { ok: false, message: "This home is not assigned to you." };
    }
    const request = id ? supabase.from("qa_records").update({ ...record, version: (version ?? 0) + 1 }).eq("id", id).eq("version", version ?? 0)
      : supabase.from("qa_records").insert({ ...record, created_by: context.userId });
    const { data, error } = await request.select("id,version").maybeSingle();
    return error || !data ? { ok: false, message: error?.message || "This record changed. Reload before saving." } : { ok: true, message: "Record saved.", ...data };
  }
  const parsed = z.object({ id: z.uuid(), version: z.number().int().positive(), operation: z.enum(["draft", "submit", "approve", "reopen"]), body: reportBodySchema.optional(), reason: z.string().max(4000).optional() }).safeParse(value);
  if (!parsed.success) return { ok: false, message: "Check the report fields." };
  const { id, version, operation, body, reason } = parsed.data;
  if (!canOpenSection(context, operation === "approve" || operation === "reopen" ? "qa.reviews" : "qa.monthly_reports")) return { ok: false, message: "This section is not enabled for your account." };
  const { data, error } = await supabase.rpc("qa_save_report", { target: id, expected_version: version, operation, content: body ?? {}, reason: reason ?? "" });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: operation === "draft" ? "Draft saved." : operation === "submit" ? "Report sent to the director." : operation === "approve" ? "Report approved." : "Report returned to the manager.", version: Number(data) };
  } catch {
    return { ok: false, message: "The server could not confirm this change. Your entries are still here." };
  }
}

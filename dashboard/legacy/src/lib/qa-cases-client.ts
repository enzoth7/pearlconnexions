import { supabase } from "../../../src/shims/supabase";
import { cached } from "../../../src/shims/cache";
import { requireGovernance } from "@/lib/auth";
import { caseDataSchema, caseErrors, caseSchema, londonInstant, personSchema, type CaseKind, type CaseRecord, type Person } from "./qa-capture";
import type { Home } from "./types";

export function loadCases(kind: CaseKind) {
  return cached(`qa:cases:${kind}`, async () => {
    const { context } = await requireGovernance(kind === "maintenance" ? "maintenance" : "qa", kind === "maintenance" ? "maintenance.issues" : `qa.${kind}`);
    const [homes, records, people, risks] = await Promise.all([
      supabase.from("qa_homes").select("*").eq("active", true).order("name"),
      supabase.from("qa_records").select("*,actions:qa_record_actions(*),reviews:qa_risk_reviews(*),history:qa_record_history(*)").eq("kind", kind).order("created_at", { ascending: false }),
      kind === "maintenance" ? Promise.resolve({ data: [], error: null }) : supabase.from("qa_people").select("*").order("code"),
      kind === "incidents" ? supabase.from("qa_records").select("id,title,home_id,data,is_draft").eq("kind", "risks").eq("is_draft", false) : Promise.resolve({ data: [], error: null }),
    ]);
    const error = homes.error || records.error || people.error || risks.error;
    if (error) throw new Error(`The QA capture upgrade must be available before these forms can load. ${error.message}`);
    const scopedHomes = (homes.data as Home[]).filter(h => context.role === "director" || (kind === "maintenance" && context.managesMaintenance) || context.homes.some(assigned => assigned.id === h.id));
    return { homes: scopedHomes, records: (records.data ?? []).map(r => ({ ...r, data: caseDataSchema.parse(r.data), actions: (r.actions ?? []).map((a: { id: string; data: object }) => ({ id: a.id, ...a.data })), reviews: (r.reviews ?? []).map((v: { id: string; data: object }) => ({ id: v.id, ...v.data })), history: r.history ?? [] })) as CaseRecord[], people: people.data as Person[], risks: risks.data as { id: string; title: string; home_id: string; data: { person_ids?: string[] } }[], canManageMaintenance: Boolean(context.managesMaintenance) };
  });
}
export async function saveCase(input: CaseRecord) {
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const record = parsed.data;
  const errors = caseErrors(record);
  if (Object.keys(errors).length) return { ok: false, message: "Complete the highlighted fields.", errors };
  record.data.occurred_at = londonInstant(record.data.occurred_local, record.data.occurred_offset) ?? "";
  record.data.notified_at = record.data.notification === "done" ? londonInstant(record.data.notified_local, record.data.notified_offset) ?? "" : "";
  if (record.kind === "incidents" && record.data.occurred_at) record.occurred_on = record.data.occurred_local.slice(0, 10);
  try {
    if (!record.is_draft && record.kind !== "maintenance" && record.data.person_name.trim() && (record.kind === "risks" || record.data.involvement === "identified")) {
      const names = record.data.person_name.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
      const lookup = await supabase.from("qa_people").select("*").eq("home_id", record.home_id);
      if (lookup.error) return { ok: false, message: lookup.error.message };
      const existing = (lookup.data ?? []) as Person[];
      const ids: string[] = [];
      for (const name of names) {
        let person = existing.find(item => item.active && item.alias.trim().toLowerCase() === name.toLowerCase());
        if (!person) {
          const created = await savePerson({ home_id: record.home_id, code: `P-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, alias: name, active: true });
          if (!created.ok || !created.person) return { ok: false, message: created.message };
          person = created.person;
          existing.push(person);
        }
        ids.push(person.id);
      }
      record.data.person_ids = [...new Set(ids)];
    }
    const { error } = await supabase.rpc("qa_save_case", { content: record });
    return { ok: !error, message: error?.message ?? "Record saved." };
  } catch { return { ok: false, message: "The save could not be confirmed. Your entries are still here; check the register before retrying." }; }
}
export async function savePerson(input: unknown) {
  const parsed = personSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, version, ...person } = parsed.data;
  try {
    const result = id ? await supabase.from("qa_people").update({ ...person, version: (version ?? 0) + 1 }).eq("id", id).eq("version", version ?? 0).select().maybeSingle()
      : await supabase.from("qa_people").insert(person).select().single();
    return { ok: !result.error && Boolean(result.data), message: result.error?.message ?? (result.data ? "Person saved." : "This person changed. Reload before editing."), person: result.data as Person | undefined };
  } catch { return { ok: false, message: "The save could not be confirmed. Your entries are still here." }; }
}
export async function appendCaseNote(record: CaseRecord, note: string) {
  try {
    const { error } = await supabase.rpc("qa_append_case_note", { target: record.id, expected_version: record.version, note });
    return { ok: !error, message: error?.message ?? "Follow-up added." };
  } catch { return { ok: false, message: "The save could not be confirmed. Your note is still here." }; }
}

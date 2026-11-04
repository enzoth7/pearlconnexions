import { z } from "zod";
import type { Home } from "@/lib/types";
import { measurementSchema, type Measurement } from "./qa-capture";

export const recordKinds = ["audits", "incidents", "risks", "maintenance"] as const;
export type RecordKind = typeof recordKinds[number];
export const recordLabels: Record<RecordKind, string> = { audits: "Audits", incidents: "Incidents", risks: "Risk assessments", maintenance: "Maintenance" };
export const recordStates: Record<RecordKind, string[]> = {
  audits: ["Draft", "Open", "Closed"], incidents: ["Follow up", "Monitoring", "Closed"],
  risks: ["Open", "Closed"], maintenance: ["Reported", "In progress", "Awaiting external", "Completed"],
};
const text = z.string().trim().max(4000);
export const recordSchema = z.object({
  id: z.uuid().optional(), version: z.number().int().positive().optional(), kind: z.enum(recordKinds), home_id: z.uuid(),
  occurred_on: z.iso.date(), title: text.min(5).max(240), status: text.min(1),
  data: z.object({ description: text.min(5), location: text, category: text, priority: text, owner: text.max(120), due_on: z.union([z.iso.date(), z.literal("")]),
    controls: text, action_taken: text, follow_up: text, checks: text, physical_intervention: z.boolean(), reported_within_24h: z.boolean(),
    workbook_action_id: z.union([z.uuid(), z.literal("")]),
  }),
}).superRefine((value, context) => {
  if (!recordStates[value.kind].includes(value.status)) context.addIssue({ code: "custom", message: "Choose a valid status.", path: ["status"] });
  if (value.kind === "risks" && !["Low", "Moderate", "High", "Extremely high"].includes(value.data.priority)) context.addIssue({ code: "custom", message: "Choose a risk level.", path: ["data", "priority"] });
});
export type GovernanceRecord = z.infer<typeof recordSchema> & { id: string; version: number; created_at: string };
export type Question = { code: string; section: number; label: string; provisions: Home["provision"][] };
export type Answer = { answer: "yes" | "no" | "na" | ""; note: string };
export type ReportBody = { answers: Record<string, Answer>; occupied_beds: string; records_confirmed: boolean; measurements?: Record<string, Measurement> };
export const reportBodySchema = z.object({ answers: z.record(z.string(), z.object({ answer: z.enum(["yes", "no", "na", ""]), note: text })), occupied_beds: z.string().max(20), records_confirmed: z.boolean(), measurements: z.record(z.string(), measurementSchema).optional() });
export function checklistScore(answers: Record<string, Answer>) {
  const applicable = Object.values(answers).filter(item => item.answer === "yes" || item.answer === "no");
  return applicable.length ? applicable.filter(item => item.answer === "yes").length / applicable.length : null;
}
export function reportErrors(body: ReportBody, questions: Question[], capacity: number | null) {
  const errors: string[] = [];
  const beds = Number(body.occupied_beds);
  if (!body.occupied_beds.trim() || !Number.isFinite(beds) || beds < 0 || (capacity !== null && beds > capacity)) errors.push("Enter average occupied beds within the home's capacity.");
  for (const question of questions) {
    const value = body.answers[question.code];
    if (!value?.answer) errors.push(question.label);
    else if (value.answer !== "yes" && !value.note.trim()) errors.push(`Explain: ${question.label}`);
  }
  if (!body.records_confirmed) errors.push("Confirm the incident, risk and maintenance registers are complete.");
  return errors;
}
export async function saveGovernance(endpoint: string, body: unknown) {
  try {
    const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error();
    const result = await response.json();
    if (typeof result?.ok !== "boolean") throw new Error();
    return { ...result, ok: response.ok && result.ok } as { ok: boolean; message: string; version?: number; id?: string };
  } catch { return { ok: false, message: "The server could not confirm this change. Your entries are still here. Check the record before trying again." }; }
}

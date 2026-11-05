import { z } from "zod";

export const riskCategories = ["Self-harm", "Missing / absence", "Violence", "Exploitation / abuse", "Medication", "Health / wellbeing", "Independence / self-care", "Other"];
export const incidentCategories = ["Missing / absence", "Assault", "Property damage", "Self-harm", "Overdose", "Verbal abuse", "Medication", "Fall / injury", "Other"];
export const maintenanceCategories = ["Doors / windows", "Electrical", "Heating / plumbing", "Furniture", "Building / decoration", "Garden", "Pest control", "Other"];
export const riskLevels = ["Low", "Moderate", "High", "Extremely high"];
export type CaseKind = "risks" | "incidents" | "maintenance";
export const caseStates: Record<CaseKind, string[]> = { risks: ["Open", "Closed"], incidents: ["Follow up", "Monitoring", "Closed"], maintenance: ["Reported", "In progress", "Awaiting external", "Completed"] };
const text = z.string().trim().max(4000);
const date = z.union([z.iso.date(), z.literal("")]);
export const personSchema = z.object({ id: z.guid().optional(), version: z.number().int().positive().optional(), home_id: z.guid(), code: text.min(1).max(40), alias: text.min(1).max(120), active: z.boolean() });
export type Person = z.infer<typeof personSchema> & { id: string; version: number };
export const actionSchema = z.object({ id: z.guid(), description: text, owner: text.max(120), due_on: date, status: z.enum(["Pending", "Completed"]), completed_on: date, resolution: text });
export const reviewSchema = z.object({ id: z.guid(), reviewed_on: date, author: text.max(120), outcome: text, residual_level: text, next_review_on: date });
export type CaseAction = z.infer<typeof actionSchema>;
export type RiskReview = z.infer<typeof reviewSchema>;
const blank = text.default("");
export const caseDataSchema = z.object({
  description: blank, category: blank, category_other: blank, priority: blank, owner: blank, due_on: date.default(""), follow_up: blank,
  location: blank, controls: blank, action_taken: blank, evaluator: blank, initial_level: blank, triggers: blank, warning_signs: blank, preventive_measures: blank, response_plan: blank,
  person_ids: z.array(z.guid()).max(50).default([]), person_name: blank, involvement: z.enum(["identified", "none", "unknown"]).default("unknown"), involvement_note: blank,
  occurred_local: blank, occurred_offset: blank, occurred_at: z.union([z.iso.datetime({ offset: true }), z.literal("")]).default(""), reporter: blank, external_reference: blank,
  safeguarding: z.enum(["yes", "no", "pending"]).default("pending"), physical_intervention: z.boolean().default(false), intervention_note: blank,
  notification: z.enum(["pending", "done", "na"]).default("pending"), notified_local: blank, notified_offset: blank, notified_at: z.union([z.iso.datetime({ offset: true }), z.literal("")]).default(""), notified_to: blank, notification_reason: blank,
  external_notifications: z.array(z.object({ recipient: text, notified_on: date, notes: text })).max(30).default([]), linked_risk_ids: z.array(z.guid()).max(50).default([]),
  provider: blank, started_on: date.default(""), closed_on: date.default(""), resolution: blank, critical_action: blank,
});
export type CaseData = z.infer<typeof caseDataSchema>;
export const caseSchema = z.object({ id: z.guid(), version: z.number().int().nonnegative(), kind: z.enum(["risks", "incidents", "maintenance"]), home_id: z.guid(), occurred_on: date,
  title: text.max(240), status: text, is_draft: z.boolean(), schema_version: z.literal(2), data: caseDataSchema,
  actions: z.array(actionSchema).max(100), reviews: z.array(reviewSchema).max(100),
});
export type CaseRecord = z.infer<typeof caseSchema> & { reference?: string; created_at?: string; history?: { id: string; changed_at: string; from_status: string | null; to_status: string; version: number }[] };
export function londonToday(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now); }
export function londonLocal(instant: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const p = Object.fromEntries(parts.map(item => [item.type, item.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// Round-trip both UK offsets: reject nonexistent spring times and require a choice for the autumn overlap.
export function londonInstant(local: string, offset = ""): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const base = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(base)) return null;
  const candidates = [0, 60].filter(minutes => !offset || String(minutes) === offset).map(minutes => new Date(base - minutes * 60000).toISOString()).filter(value => londonLocal(value) === local);
  return candidates.length === 1 ? candidates[0] : null;
}
export function reportedWithin24h(data: Pick<CaseData, "notification" | "occurred_at" | "notified_at">): boolean | null {
  if (data.notification !== "done" || !data.occurred_at || !data.notified_at) return null;
  const hours = (Date.parse(data.notified_at) - Date.parse(data.occurred_at)) / 3600000;
  return Number.isFinite(hours) && hours >= 0 ? hours <= 24 : null;
}
export function emptyCase(kind: CaseKind, homeId: string): CaseRecord {
  return { id: crypto.randomUUID(), version: 0, kind, home_id: homeId, occurred_on: londonToday(), title: "", status: caseStates[kind][0], is_draft: true, schema_version: 2, data: caseDataSchema.parse({}), actions: [], reviews: [] };
}
export function caseErrors(record: CaseRecord): Record<string, string> {
  const errors: Record<string, string> = {}; const d = record.data;
  const names = (d.person_name ?? "").split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  const need = (key: string, value: unknown, message = "This field is required.") => { if (value === "" || value === null || value === undefined || (Array.isArray(value) && !value.length)) errors[key] = message; };
  if (!caseStates[record.kind].includes(record.status)) errors.status = "Choose a valid status.";
  if (record.is_draft) return errors;
  need("occurred_on", record.occurred_on); need("title", record.title); need("description", d.description); need("category", d.category); need("priority", d.priority);
  const categories = record.kind === "risks" ? riskCategories : record.kind === "incidents" ? incidentCategories : maintenanceCategories;
  if (!categories.includes(d.category)) errors.category = "Choose a category.";
  if (d.category === "Other") need("category_other", d.category_other);
  const levels = record.kind === "risks" ? riskLevels : record.kind === "incidents" ? ["Low", "Moderate", "High", "Critical"] : ["Low", "Moderate", "High", "Urgent"];
  if (!levels.includes(d.priority)) errors.priority = "Choose a level.";
  if (record.kind === "risks") {
    if (names.length ? names.length !== 1 : d.person_ids.length !== 1) errors.person_name = "Enter one person.";
    if (names.some(name => name.length > 120)) errors.person_name = "Keep the person's name under 120 characters.";
    for (const key of ["evaluator", "controls", "owner", "due_on"] as const) need(key, d[key]);
    if (!riskLevels.includes(d.initial_level)) errors.initial_level = "Choose the initial level.";
    if (d.due_on && d.due_on < record.occurred_on) errors.due_on = "Review must not precede assessment.";
  }
  if (record.kind === "incidents") {
    need("reporter", d.reporter); need("action_taken", d.action_taken);
    if (!londonInstant(d.occurred_local, d.occurred_offset)) errors.occurred_local = "Enter a valid London time; choose GMT/BST if the clock repeats.";
    if (d.involvement === "identified") {
      if (!names.length && !d.person_ids.length) errors.person_name = "Enter at least one person.";
      if (names.length > 50 || names.some(name => name.length > 120)) errors.person_name = "Use up to 50 names, each under 120 characters.";
    } else { need("involvement_note", d.involvement_note); if (d.person_ids.length || names.length) errors.person_name = "Clear the names or choose identified people."; }
    if (d.physical_intervention) need("intervention_note", d.intervention_note);
    if (d.notification === "done") {
      need("notified_to", d.notified_to);
      const notified = londonInstant(d.notified_local, d.notified_offset); const occurred = londonInstant(d.occurred_local, d.occurred_offset);
      if (!notified) errors.notified_local = "Enter a valid London time; choose GMT/BST if needed.";
      else if (occurred && notified < occurred) errors.notified_local = "Notification cannot precede the incident.";
    }
    if (d.notification === "na") need("notification_reason", d.notification_reason);
    if (record.status !== "Closed") { need("owner", d.owner); need("due_on", d.due_on); }
    d.external_notifications.forEach((n, i) => { need(`external.${i}.recipient`, n.recipient); need(`external.${i}.notified_on`, n.notified_on); });
  }
  if (record.kind === "maintenance") {
    need("location", d.location);
    if (d.priority === "Urgent") need("critical_action", d.critical_action, "Record the immediate action taken to keep people safe.");
    if (["In progress", "Awaiting external"].includes(record.status)) { need("owner", d.owner); need("started_on", d.started_on); need("due_on", d.due_on); }
    if (d.started_on && d.started_on < record.occurred_on) errors.started_on = "Start cannot precede the report.";
  }
  if (["Closed", "Completed"].includes(record.status)) {
    need("closed_on", d.closed_on); need("resolution", d.resolution);
    if (d.closed_on && d.closed_on < (d.started_on || record.occurred_on)) errors.closed_on = "Closure cannot precede the report or start.";
    if (record.actions.some(a => a.status !== "Completed")) errors.actions = "Complete the outstanding actions before closing.";
  }
  record.actions.forEach((a, i) => {
    for (const key of ["description", "owner", "due_on"] as const) need(`actions.${i}.${key}`, a[key]);
    if (a.status === "Completed") { need(`actions.${i}.completed_on`, a.completed_on); need(`actions.${i}.resolution`, a.resolution); if (a.completed_on && a.completed_on < record.occurred_on) errors[`actions.${i}.completed_on`] = "Completion cannot precede this record."; }
  });
  record.reviews.forEach((r, i) => {
    for (const key of ["reviewed_on", "author", "outcome", "next_review_on"] as const) need(`reviews.${i}.${key}`, r[key]);
    if (!riskLevels.includes(r.residual_level)) errors[`reviews.${i}.residual_level`] = "Choose a risk level.";
    if (r.next_review_on < r.reviewed_on) errors[`reviews.${i}.next_review_on`] = "Next review cannot precede this review.";
  });
  return errors;
}

export const monthlyMeasures = [
  { code: "daily_records", label: "Daily records", unit: "records", help: "Required daily entries for the people supported." },
  { code: "weekly_reports", label: "Weekly reports", unit: "reports", help: "Weekly reports due in this month." },
  { code: "medication_checks", label: "Medication checks", unit: "checks", help: "Scheduled checks of medication records; not doses administered." },
  { code: "supervisions", label: "Staff supervisions", unit: "sessions", help: "Supervision sessions due for staff this month." },
  { code: "activities", label: "Agreed activities", unit: "activities", help: "Activities agreed in individual support plans." },
  { code: "key_work", label: "Individual support sessions", unit: "sessions", help: "Planned key work or individual support sessions." },
  { code: "health_safety", label: "Health and safety checks", unit: "checks", help: "Required scheduled health and safety checks." },
  { code: "fire_logs", label: "Fire safety logs", unit: "records", help: "Required fire safety log entries." },
  { code: "fire_drills", label: "Fire drills", unit: "drills", help: "Scheduled fire drills due this month." },
  { code: "first_aid", label: "First aid checks", unit: "checks", help: "Scheduled first aid supply and equipment checks." },
] as const;
export type Measurement = { expected: string; completed: string; na: boolean; note: string };
export const measurementSchema = z.object({ expected: z.string().max(10), completed: z.string().max(10), na: z.boolean(), note: text });
export function measurementErrors(measures: Record<string, Measurement> = {}) {
  const errors: Record<string, string> = {};
  for (const m of monthlyMeasures) {
    const v = measures[m.code];
    if (!v) { errors[m.code] = "Enter quantities or explain why this does not apply."; continue; }
    if (v.na) { if (!v.note.trim()) errors[m.code] = "Explain why this does not apply."; continue; }
    if (!/^\d+$/.test(v.expected) || !/^\d+$/.test(v.completed) || Number(v.completed) > Number(v.expected)) errors[m.code] = "Enter whole numbers; completed cannot exceed expected.";
    else if (Number(v.expected) === 0 && !v.note.trim()) errors[m.code] = "Explain why no obligations were expected.";
  }
  return errors;
}
export function qaRating(ratio: number | null) {
  const value = ratio === null || !Number.isFinite(ratio) ? null : Math.round((ratio * 100 + Number.EPSILON) * 100) / 100;
  if (value === null || value < 0 || value > 100) return { value: null, label: "Not available", className: "bg-slate-100 text-slate-700" };
  if (value <= 50) return { value, label: "Inadequate", className: "bg-red-100 text-red-900" };
  if (value <= 75) return { value, label: "Requires improvement", className: "bg-amber-100 text-amber-900" };
  if (value <= 90) return { value, label: "Good", className: "bg-green-100 text-green-900" };
  return { value, label: "Outstanding", className: "bg-green-700 text-white" };
}

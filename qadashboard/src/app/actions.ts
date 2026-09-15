"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDirector, requireHouseLead } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok?: boolean;
  message?: string;
  version?: number;
  errors?: Record<string, string[]>;
};

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address").transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const store = await headers();
  const host = store.get("x-forwarded-host") || store.get("host");
  return `${store.get("x-forwarded-proto") || "https"}://${host}`;
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check your sign-in details.", errors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "Email or password is incorrect." };
  redirect("/");
}

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email: z.email().transform((value) => value.trim().toLowerCase()) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/update-password`,
  });
  if (error) return { message: error.message };
  return { ok: true, message: "If the account exists, a reset link has been sent." };
}

export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    password: z.string().min(8),
    confirm_password: z.string(),
  }).refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the password fields.", errors: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: error.message };
  return { ok: true, message: "Password updated. You can continue to the portal." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function numberOrNull(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") return null;
  const parsed = z.coerce.number().nonnegative().safeParse(value);
  if (!parsed.success) throw new Error("Metrics must be non-negative numbers.");
  return parsed.data;
}

const nullableTrimmedString = (maximum: number) =>
  z.union([z.string().trim().max(maximum), z.null()]).transform((value) => value || null);

const incidentDraftSchema = z.object({
  incident_number: z.number().int().positive(),
  occurred_local: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    z.null(),
  ]),
  incident_type: nullableTrimmedString(80),
  severity: z.union([z.enum(["low", "moderate", "high", "critical"]), z.null()]),
  summary: nullableTrimmedString(240),
  details: nullableTrimmedString(2000),
  action_taken: nullableTrimmedString(2000),
  follow_up_notes: nullableTrimmedString(2000),
  physical_intervention: z.boolean(),
  reported_within_24h: z.boolean(),
  status: z.union([z.enum(["closed", "monitoring", "follow_up"]), z.null()]),
});

export async function saveDraft(_: ActionState, formData: FormData): Promise<ActionState> {
  const base = z.object({
    submission_id: z.uuid(),
    version: z.coerce.number().int().positive(),
    audit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).safeParse(Object.fromEntries(formData));
  if (!base.success) return { message: "Check the audit date and refresh the form." };
  await requireHouseLead();

  const metrics = new Map<string, { metric_code: string; expected: number | null; actual: number | null }>();
  try {
    for (const [key, value] of formData.entries()) {
      const match = /^metric_([A-Za-z][A-Za-z0-9_]*)_(expected|actual)$/.exec(key);
      if (!match) continue;
      const [, metricCode, field] = match;
      const entry = metrics.get(metricCode) ?? { metric_code: metricCode, expected: null, actual: null };
      entry[field as "expected" | "actual"] = numberOrNull(value);
      metrics.set(metricCode, entry);
    }
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Check the metric values." };
  }

  let incidents: z.infer<typeof incidentDraftSchema>[];
  try {
    const raw = formData.get("incident_entries");
    incidents = z.array(incidentDraftSchema).max(100).parse(JSON.parse(typeof raw === "string" ? raw : "[]"));
  } catch {
    return { message: "Check the incident records and try saving again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qa_save_draft", {
    target_submission_id: base.data.submission_id,
    expected_version: base.data.version,
    target_audit_date: base.data.audit_date,
    entries: Array.from(metrics.values()),
    incident_entries: incidents,
  });
  if (error) return { message: error.message };
  revalidatePath("/portal");
  revalidatePath(`/portal/submissions/${base.data.submission_id}`);
  revalidatePath(`/director/reviews/${base.data.submission_id}`);
  return { ok: true, message: "Draft saved.", version: Number(data) };
}

export async function submitSubmission(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    submission_id: z.uuid(),
    version: z.coerce.number().int().positive(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Refresh the form before submitting." };
  await requireHouseLead();
  const supabase = await createClient();
  const { error } = await supabase.rpc("qa_submit_submission", {
    target_submission_id: parsed.data.submission_id,
    expected_version: parsed.data.version,
  });
  if (error) return { message: error.message };
  revalidatePath("/portal");
  revalidatePath(`/portal/submissions/${parsed.data.submission_id}`);
  return { ok: true, message: "Report submitted and locked." };
}

export async function approveSubmission(formData: FormData) {
  const id = z.uuid().parse(formData.get("submission_id"));
  const { supabase } = await requireDirector();
  const { error } = await supabase.rpc("qa_approve_submission", { target_submission_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/director");
  revalidatePath("/director/reviews");
  revalidatePath(`/director/reviews/${id}`);
}

export async function reopenSubmission(formData: FormData) {
  const parsed = z.object({ submission_id: z.uuid(), reason: z.string().trim().min(5).max(1000) }).parse(Object.fromEntries(formData));
  const { supabase } = await requireDirector();
  const { error } = await supabase.rpc("qa_reopen_submission", {
    target_submission_id: parsed.submission_id,
    reason: parsed.reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/director");
  revalidatePath("/director/reviews");
  revalidatePath(`/director/reviews/${parsed.submission_id}`);
}

export async function repairPeriod(_: ActionState, formData: FormData): Promise<ActionState> {
  const month = z.string().regex(/^\d{4}-\d{2}$/).safeParse(formData.get("month"));
  if (!month.success) return { message: "Choose a valid month." };
  const { supabase } = await requireDirector();
  const { error } = await supabase.rpc("qa_repair_period", { target_month: `${month.data}-01` });
  if (error) return { message: error.message };
  revalidatePath("/director");
  revalidatePath("/director/settings");
  return { ok: true, message: "Period checked and missing drafts repaired." };
}

const inviteSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  display_name: z.string().trim().min(2).max(120),
  home_ids: z.array(z.uuid()).min(1, "Assign at least one home."),
});

export async function inviteMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    display_name: formData.get("display_name"),
    home_ids: formData.getAll("home_ids"),
  });
  if (!parsed.success) return { message: "Check the invitation details.", errors: z.flattenError(parsed.error).fieldErrors };
  const { context, supabase } = await requireDirector();
  const admin = createAdminClient();
  if (!admin) return { message: "Invitations need the server-only SUPABASE_SECRET_KEY in Vercel." };
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/update-password`,
    data: { display_name: parsed.data.display_name },
  });
  if (error || !data.user) return { message: error?.message || "Supabase did not return the invited user." };
  const { data: member, error: memberError } = await supabase.from("qa_members").upsert({
    user_id: data.user.id,
    email: parsed.data.email,
    display_name: parsed.data.display_name,
    active: true,
    invited_by: context.userId,
  }, { onConflict: "user_id" }).select("id").single();
  if (memberError) return { message: memberError.message };
  await supabase.from("qa_member_homes").delete().eq("member_id", member.id);
  const { error: homesError } = await supabase.from("qa_member_homes").insert(
    parsed.data.home_ids.map((homeId) => ({ member_id: member.id, home_id: homeId, assigned_by: context.userId })),
  );
  if (homesError) return { message: homesError.message };
  revalidatePath("/director/users");
  return { ok: true, message: "Invitation sent and homes assigned." };
}

export async function updateMember(formData: FormData) {
  const parsed = z.object({
    member_id: z.uuid(),
    active: z.enum(["true", "false"]).transform((value) => value === "true"),
    display_name: z.string().trim().min(2).max(120),
    home_ids: z.array(z.uuid()),
  }).parse({
    member_id: formData.get("member_id"),
    active: formData.get("active"),
    display_name: formData.get("display_name"),
    home_ids: formData.getAll("home_ids"),
  });
  const { context, supabase } = await requireDirector();
  const { error } = await supabase.from("qa_members").update({
    display_name: parsed.display_name,
    active: parsed.active,
  }).eq("id", parsed.member_id);
  if (error) throw new Error(error.message);
  await supabase.from("qa_member_homes").delete().eq("member_id", parsed.member_id);
  if (parsed.home_ids.length > 0) {
    const { error: assignmentError } = await supabase.from("qa_member_homes").insert(
      parsed.home_ids.map((homeId) => ({ member_id: parsed.member_id, home_id: homeId, assigned_by: context.userId })),
    );
    if (assignmentError) throw new Error(assignmentError.message);
  }
  revalidatePath("/director/users");
}

export async function updateHome(formData: FormData) {
  const parsed = z.object({
    home_id: z.uuid(),
    name: z.string().trim().min(2).max(120),
    provision: z.enum(["Children's Home", "Supported Living", "Supported Accommodation"]),
    total_beds: z.union([z.literal(""), z.coerce.number().nonnegative()]).transform((value) => value === "" ? null : value),
    active: z.enum(["true", "false"]).transform((value) => value === "true"),
  }).parse(Object.fromEntries(formData));
  const { supabase } = await requireDirector();
  const { home_id, ...values } = parsed;
  const { error } = await supabase.from("qa_homes").update(values).eq("id", home_id);
  if (error) throw new Error(error.message);
  revalidatePath("/director");
  revalidatePath("/director/homes");
}

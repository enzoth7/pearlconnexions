"use server";

import { workspaceSectionIds } from "@/lib/workspace-sections";
import { workspaceReturnPath } from "@/lib/workspace-return";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDirector, requireHouseLead, requireSettingsAccess, requireWorkspaceAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok?: boolean;
  message?: string;
  version?: number;
  errors?: Record<string, string[]>;
};

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  // Existing Workbook passwords may predate the current password creation rules.
  password: z.string().min(1, "Enter your password"),
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
  redirect(workspaceReturnPath(formData.get("next")));
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

export async function switchAccount() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?switch=1");
}

export async function saveWorkspacePermissions(_: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("sections_version") === "1") {
    const parsed = z.object({ user_id: z.uuid(), sections: z.array(z.string()).max(50) }).safeParse({ user_id: formData.get("user_id"), sections: formData.getAll("sections") });
    if (!parsed.success || parsed.data.sections.some(key => !workspaceSectionIds.includes(key as typeof workspaceSectionIds[number]))) return { ok: false, message: "Choose valid sections." };
    const { supabase } = await requireSettingsAccess();
    const result = await supabase.rpc("save_workspace_sections", { target_user: parsed.data.user_id, sections: [...new Set(parsed.data.sections)], workbook_enabled: formData.has("workbook"), maintenance_lead: formData.has("can_manage_maintenance") });
    if (result.error) return { ok: false, message: result.error.message };
    revalidatePath("/config/permissions"); revalidatePath("/config/users"); revalidatePath("/", "layout");
    return { ok: true, message: "Section access saved." };
  }
  const parsed = z.object({
    user_id: z.uuid(),
    qa: z.string().optional(),
    workbook: z.string().optional(),
    finance: z.string().optional(),
    hr: z.string().optional(),
    maintenance: z.string().optional(),
    can_manage_maintenance: z.string().optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Invalid permission selection." };
  const { context, supabase } = await requireWorkspaceAdmin();
  if (parsed.data.user_id === context.userId) return { message: "The workspace administrator keeps full access." };

  const [profile, member] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", parsed.data.user_id).maybeSingle(),
    supabase.from("qa_members").select("active").eq("user_id", parsed.data.user_id).maybeSingle(),
  ]);
  if (profile.error || member.error) return { message: profile.error?.message || member.error?.message };
  if (!profile.data && !member.data) return { message: "This user no longer exists." };
  if (profile.data?.role === "director") return { message: "Director access is managed separately." };

  const { error } = await supabase.from("workspace_access").upsert({
    user_id: parsed.data.user_id,
    qa: Boolean(parsed.data.qa),
    workbook: Boolean(profile.data?.role === "manager" && parsed.data.workbook),
    finance: Boolean(parsed.data.finance),
    hr: Boolean(parsed.data.hr),
    maintenance: Boolean(parsed.data.maintenance || parsed.data.can_manage_maintenance),
    can_manage_maintenance: Boolean(parsed.data.can_manage_maintenance),
    is_admin: false,
    updated_at: new Date().toISOString(),
  });
  if (error) return { message: error.message };
  revalidatePath("/config/permissions");
  revalidatePath("/config/users");
  return { ok: true, message: "Permissions saved." };
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
  revalidatePath("/config/users");
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
  revalidatePath("/config/users");
}

export async function saveQaAccount(formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    member_id: z.uuid(),
    display_name: z.string().trim().min(2).max(120),
    email: z.email().transform(value => value.trim().toLowerCase()),
    password: z.union([z.literal(""), z.string().min(8)]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the name, email and password." };

  const { supabase } = await requireWorkspaceAdmin();
  const { data: member, error: memberError } = await supabase.from("qa_members")
    .select("id,user_id,email").eq("id", parsed.data.member_id).maybeSingle();
  if (memberError || !member?.user_id) return { message: memberError?.message || "This House Lead account is unavailable." };
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role").eq("id", member.user_id).maybeSingle();
  if (profileError) return { message: profileError.message };
  if (profile?.role === "manager" || profile?.role === "director") {
    return { message: "Edit this person's linked manager account instead." };
  }

  const admin = createAdminClient();
  if (!admin) return { message: "Account changes require the server secret key." };
  const emailChanged = parsed.data.email !== member.email?.toLowerCase();
  if (emailChanged || parsed.data.password) {
    const { error } = await admin.auth.admin.updateUserById(member.user_id, {
      ...(emailChanged ? { email: parsed.data.email, email_confirm: true } : {}),
      ...(parsed.data.password ? { password: parsed.data.password } : {}),
    });
    if (error) return { message: error.message };
  }
  const { error } = await supabase.from("qa_members").update({
    display_name: parsed.data.display_name,
    email: parsed.data.email,
  }).eq("id", member.id);
  if (error) return { message: error.message };
  if (profile) {
    const result = await admin.from("profiles").update({ display_name: parsed.data.display_name }).eq("id", member.user_id);
    if (result.error) return { message: result.error.message };
  }
  revalidatePath("/config/users");
  revalidatePath("/config/permissions");
  return { ok: true, message: "User saved." };
}

export async function saveQaHomeAssignments(formData: FormData): Promise<ActionState> {
  const { supabase } = await requireSettingsAccess();
  const parsed = z.object({ user_id: z.uuid().optional(), member_id: z.uuid().optional(), active: z.enum(["true", "false"]), home_ids: z.array(z.uuid()) }).safeParse({
    user_id: formData.get("user_id") || undefined, member_id: formData.get("member_id") || undefined, active: formData.get("active") ?? "false", home_ids: formData.getAll("home_ids"),
  });
  if (!parsed.success) return { ok: false, message: "Check the home assignments." };
  let userId = parsed.data.user_id;
  if (!userId && parsed.data.member_id) {
    const member = await supabase.from("qa_members").select("user_id").eq("id", parsed.data.member_id).maybeSingle();
    if (member.error) return { ok: false, message: member.error.message };
    userId = member.data?.user_id;
  }
  if (!userId) return { ok: false, message: "A login account is required." };
  const result = await supabase.rpc("qa_assign_homes", { target_user: userId, enabled: parsed.data.active === "true", homes: [...new Set(parsed.data.home_ids)] });
  if (result.error) return { ok: false, message: result.error.message };
  revalidatePath("/config/users"); revalidatePath("/config/permissions"); revalidatePath("/qa");
  return { ok: true, message: "Home assignments saved." };
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

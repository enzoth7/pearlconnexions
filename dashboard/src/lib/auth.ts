import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Home } from "@/lib/types";
import { canOpenSection, firstWorkspacePath, workspaceSectionGroups, type WorkspaceSection } from "@/lib/workspace-sections";

type MemberRow = {
  id: string;
  display_name: string;
  active: boolean;
  qa_member_homes: Array<{ qa_homes: Home | Home[] | null }>;
};

export type AccessContext = {
  userId: string;
  email: string;
  name: string;
  role: "director" | "house_lead" | "pending";
  workbookRole: "director" | "manager" | null;
  finance: boolean;
  hr: boolean;
  isAdmin: boolean;
  qaEnabled?: boolean;
  maintenance?: boolean;
  managesMaintenance?: boolean;
  managerId?: string | null;
  canManageEmployees?: boolean;
  canManageLogins?: boolean;
  sections?: string[];
  homes: Home[];
};

export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const userId = String(claims.sub);
  const email = typeof claims.email === "string" ? claims.email : "";
  const [profileResult, memberResult, accessResult] = await Promise.all([
    supabase.from("profiles").select("display_name, role, manager_id").eq("id", userId).maybeSingle(),
    supabase
      .from("qa_members")
      .select("id, display_name, active, qa_member_homes(qa_homes(id,code,name,provision,total_beds,active))")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("workspace_access").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (accessResult.error) throw new Error(accessResult.error.message);
  const access = accessResult.data;
  const managerId = profileResult.data?.manager_id as string | null | undefined;
  const managerResult = profileResult.data?.role === "manager" && managerId
    ? await supabase.from("managers").select("can_manage_employees,can_manage_logins").eq("id", managerId).maybeSingle()
    : null;
  if (managerResult?.error) throw new Error(managerResult.error.message);
  const effectiveResult = profileResult.data?.role === "manager"
    ? await supabase.rpc("my_effective_access")
    : null;
  if (effectiveResult?.error) throw new Error(effectiveResult.error.message);
  const effective = effectiveResult?.data as { sections?: string[]; workbook?: boolean; can_manage_employees?: boolean; can_manage_logins?: boolean; maintenance_lead?: boolean; homes?: string[] } | null | undefined;
  const sections = Array.isArray(effective?.sections) ? effective.sections : Array.isArray(access?.visible_sections) ? access.visible_sections as string[] : undefined;
  const shared = { finance: Boolean(access?.finance), hr: Boolean(access?.hr), isAdmin: Boolean(access?.is_admin), qaEnabled: access?.qa === true || Boolean(memberResult.data?.active && access?.qa !== false), maintenance: Boolean(access?.maintenance), managesMaintenance: effective ? Boolean(effective.maintenance_lead) : Boolean(access?.maintenance && access?.can_manage_maintenance), sections, managerId: managerId ?? null, canManageEmployees: effective ? Boolean(effective.can_manage_employees) : Boolean(managerResult?.data?.can_manage_employees), canManageLogins: effective ? Boolean(effective.can_manage_logins) : Boolean(managerResult?.data?.can_manage_logins) };

  if (profileResult.data?.role === "director") {
    return {
      userId,
      email,
      name: profileResult.data.display_name || "Joel Samuel",
      role: "director",
      workbookRole: "director",
      ...shared,
      finance: true,
      hr: true,
      maintenance: true,
      managesMaintenance: true,
      qaEnabled: true,
      homes: [],
    };
  }

  const workbookRole = profileResult.data?.role === "manager" && effective?.workbook === true && access?.workbook === true ? "manager" : null;
  const member = memberResult.data as MemberRow | null;
  const homes = (member?.qa_member_homes ?? []).flatMap((assignment) => {
    const value = assignment.qa_homes;
    return Array.isArray(value) ? value : value ? [value] : [];
  }).filter((home) => home.active && (!effective || effective.homes?.includes(home.id)));

  if (member?.active && access?.qa !== false) {
    return { userId, email, name: member.display_name, role: "house_lead", workbookRole, ...shared, homes };
  }
  return {
    userId,
    email,
    name: profileResult.data?.display_name || member?.display_name || email.split("@")[0] || "User",
    role: "pending",
    workbookRole,
    ...shared,
    homes: member?.active ? homes : [],
  };
});

export async function requireSection(section: WorkspaceSection) {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (!canOpenSection(context, section)) redirect(firstWorkspacePath(context));
  return { context, supabase: await createClient() };
}

export async function requireReportAccess() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (!canOpenSection(context, "qa.monthly_reports") && !canOpenSection(context, "qa.reviews")) redirect(firstWorkspacePath(context));
  return { context, supabase: await createClient() };
}

export async function requireGovernance(area: "qa" | "maintenance" | "team" = "qa", section?: WorkspaceSection) {
  if (section) return requireSection(section);
  const context = await getAccessContext();
  if (!context) redirect("/login");
  const group = workspaceSectionGroups.find(group => group.id === area);
  if (!group?.sections.some(item => canOpenSection(context, item.id))) redirect(firstWorkspacePath(context));
  return { context, supabase: await createClient() };
}

export async function requireDirector() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.role === "house_lead") redirect("/portal");
  if (context.role !== "director") redirect(context.workbookRole ? "/workbook" : "/access-pending");
  return { context, supabase: await createClient() };
}

export async function requireWorkspaceAdmin() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (!context.isAdmin || context.role !== "director") redirect("/");
  return { context, supabase: await createClient() };
}

export async function requireSettingsAccess() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (!(context.role === "director" && context.isAdmin) && !(context.managerId && context.canManageEmployees)) redirect(firstWorkspacePath(context));
  return { context, supabase: await createClient() };
}

export async function requireWorkspaceArea(area: "finance" | "hr") {
  return (await requireSection(area === "finance" ? "finance.overview" : "hr.overview")).context;
}

export async function requireHouseLead() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.role === "director") redirect("/director");
  if (context.role !== "house_lead") redirect(context.workbookRole ? "/workbook" : "/access-pending");
  if (!canOpenSection(context, "qa.monthly_reports")) redirect(firstWorkspacePath(context));
  return { context, supabase: await createClient() };
}

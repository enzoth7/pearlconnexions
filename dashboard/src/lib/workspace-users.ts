import { requireSettingsAccess } from "@/lib/auth";

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  managerId: string | null;
  qaMemberId: string | null;
  qaMemberActive: boolean;
  qaAssignedHomeIds: string[];
  hasQaMembership: boolean;
  canUseWorkbook: boolean;
  qa: boolean;
  workbook: boolean;
  finance: boolean;
  hr: boolean;
  isAdmin: boolean;
  maintenance?: boolean;
  canManageMaintenance?: boolean;
  sections?: string[];
};

export async function getWorkspaceUsers(): Promise<WorkspaceUser[]> {
  const { context, supabase } = await requireSettingsAccess();
  const [profiles, members, managers, access] = await Promise.all([
    supabase.from("profiles").select("id,display_name,role,manager_id"),
    supabase.from("qa_members").select("id,user_id,display_name,email,active,qa_member_homes(home_id)"),
    supabase.from("managers").select("id,email,parent_manager_id"),
    supabase.from("workspace_access").select("*"),
  ]);
  const error = profiles.error || members.error || managers.error || access.error;
  if (error) throw new Error(error.message);

  const managerEmails = new Map((managers.data ?? []).map(row => [row.id, row.email ?? ""]));
  const memberships = new Map((members.data ?? []).filter(row => row.user_id).map(row => [row.user_id, row]));
  const accessRows = new Map((access.data ?? []).map(row => [row.user_id, row]));
  const managerIds = context.role === "director" ? null : new Set((managers.data ?? [])
    .filter(row => row.id === context.managerId || row.parent_manager_id === context.managerId)
    .map(row => row.id));
  const ids = new Set([
    ...(profiles.data ?? []).map(row => row.id),
    ...memberships.keys(),
  ]);
  return [...ids].filter(id => context.role === "director" || (profiles.data ?? []).some(row => row.id === id && row.manager_id && managerIds?.has(row.manager_id))).map(id => {
    const profile = (profiles.data ?? []).find(row => row.id === id);
    const member = memberships.get(id);
    const permissions = accessRows.get(id);
    const isDirector = profile?.role === "director";
    return {
      id,
      name: profile?.display_name || member?.display_name || "Unnamed user",
      email: managerEmails.get(profile?.manager_id ?? "") || member?.email || "",
      role: isDirector ? "Director" : profile?.role === "manager" ? "Manager" : member ? "House lead" : "Pending",
      managerId: profile?.manager_id ?? null,
      qaMemberId: member?.id ?? null,
      qaMemberActive: Boolean(member?.active),
      qaAssignedHomeIds: (member?.qa_member_homes ?? []).map(item => item.home_id),
      hasQaMembership: Boolean(member?.active),
      canUseWorkbook: isDirector || profile?.role === "manager",
      qa: isDirector || permissions?.qa === true || (Boolean(member?.active) && permissions?.qa !== false),
      workbook: (isDirector || profile?.role === "manager") && permissions?.workbook !== false,
      finance: Boolean(permissions?.finance),
      hr: Boolean(permissions?.hr),
      maintenance: isDirector || Boolean(permissions?.maintenance),
      canManageMaintenance: isDirector || Boolean(permissions?.can_manage_maintenance),
      sections: Array.isArray(permissions?.visible_sections) ? permissions.visible_sections : undefined,
      isAdmin: Boolean(permissions?.is_admin),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

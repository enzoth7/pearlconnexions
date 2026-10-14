import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionRecord, Manager, Workstream } from "@/lib/utils";

export type Profile = {
  id: string;
  display_name: string;
  role: "director" | "manager" | "pending";
  manager_id: string | null;
};

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
  isDirector: boolean;
  isManager: boolean;
  managerId: string | null;
  canManageEmployees: boolean;
  canAddActions: boolean;
  canEditActions: boolean;
  canDeleteActions: boolean;
  canReassignActions: boolean;
  canSignOffActions: boolean;
  canManageLogins: boolean;
};

export type ManagerWithProfile = Manager & {
  email: string | null;
  source_code?: string | null;
  profile_id?: string | null;
  profile: {
    id: string;
    display_name: string;
    role: string;
  } | null;
};

export type ManagerDirectory = {
  managers: ManagerWithProfile[];
  teamHierarchyReady: boolean;
  permissionsReady: boolean;
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

export function isMissingTeamHierarchyColumn(error: SupabaseErrorLike | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    message.includes("parent_manager_id") ||
    message.includes("can_manage_employees")
  );
}

export function isMissingGranularPermissionsColumn(error: SupabaseErrorLike | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" &&
    (message.includes("can_add_actions") ||
      message.includes("can_edit_actions") ||
      message.includes("can_delete_actions") ||
      message.includes("can_reassign_actions") ||
      message.includes("can_sign_off_actions") ||
      message.includes("can_manage_logins"))
  );
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, manager_id")
    .eq("id", claims.claims.sub)
    .single();

  if (!profile || profile.role === "pending") redirect("/access-pending");

  let canManageEmployees = false;
  let canAddActions = profile.role === "director";
  let canEditActions = profile.role === "director";
  let canDeleteActions = profile.role === "director";
  let canReassignActions = profile.role === "director";
  let canSignOffActions = profile.role === "director";
  let canManageLogins = profile.role === "director";
  if (profile.role === "manager" && profile.manager_id) {
    let { data: manager, error: managerError } = await supabase
      .from("managers")
      .select("can_manage_employees, can_add_actions, can_edit_actions, can_delete_actions, can_reassign_actions, can_sign_off_actions, can_manage_logins")
      .eq("id", profile.manager_id)
      .maybeSingle();

    if (isMissingGranularPermissionsColumn(managerError)) {
      const legacyResult = await supabase
        .from("managers")
        .select("can_manage_employees")
        .eq("id", profile.manager_id)
        .maybeSingle();
      manager = legacyResult.data
        ? {
            ...legacyResult.data,
            can_add_actions: true,
            can_edit_actions: true,
            can_delete_actions: false,
            can_reassign_actions: true,
            can_sign_off_actions: true,
            can_manage_logins: Boolean(legacyResult.data.can_manage_employees),
          }
        : null;
      managerError = legacyResult.error;
    }

    if (managerError) throw new Error(managerError.message);
    canManageEmployees = Boolean(manager?.can_manage_employees);
    canAddActions = Boolean(manager?.can_add_actions);
    canEditActions = Boolean(manager?.can_edit_actions);
    canDeleteActions = Boolean(manager?.can_delete_actions);
    canReassignActions = Boolean(manager?.can_reassign_actions);
    canSignOffActions = Boolean(manager?.can_sign_off_actions);
    canManageLogins = Boolean(manager?.can_manage_logins);
  }

  return {
    supabase,
    profile: profile as Profile,
    isDirector: profile.role === "director",
    isManager: profile.role === "manager",
    managerId: (profile.manager_id as string | null) ?? null,
    canManageEmployees,
    canAddActions,
    canEditActions,
    canDeleteActions,
    canReassignActions,
    canSignOffActions,
    canManageLogins,
  };
}

export async function requireDirector() {
  const auth = await requireAuth();
  if (!auth.isDirector) redirect("/access-pending");
  return { supabase: auth.supabase, profile: auth.profile };
}

export async function requireEditor() {
  const auth = await requireAuth();
  if (!auth.isDirector && !(auth.isManager && auth.managerId)) {
    redirect("/");
  }
  return auth;
}

export async function requireTeamAdmin() {
  return requireEditor();
}

export async function getActions(managerIdFilter?: string): Promise<ActionRecord[]> {
  const { supabase, isDirector } = await requireAuth();
  const { data, error } = await supabase
    .from("actions")
    .select(
      "*, workstream:workstreams(id, name), participants:action_participants(id,responsibility_type,responsibility_text,manager:managers(id,name,role_title,source_code)), updates:action_updates(*), signoffs:action_signoffs(id,signed_off_at,signed_off_by_name)"
    )
    .order("reference");

  if (error) throw new Error(error.message);

  const actions = (data ?? []) as unknown as ActionRecord[];

  if (isDirector && managerIdFilter) {
    return actions.filter((action) =>
      action.participants?.some((p) => p.manager?.id === managerIdFilter)
    );
  }

  return actions;
}

export async function getActionById(id: string): Promise<ActionRecord | null> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("actions")
    .select(
      "*, workstream:workstreams(id, name), participants:action_participants(id,responsibility_type,responsibility_text,manager:managers(id,name,role_title,source_code)), updates:action_updates(*), signoffs:action_signoffs(id,signed_off_at,signed_off_by_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return data as unknown as ActionRecord;
}

export async function getWorkstreams(): Promise<Workstream[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.from("workstreams").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Workstream[];
}

export async function getManagers(): Promise<Manager[]> {
  const { supabase, isManager, managerId } = await requireAuth();
  let { data, error } = await supabase
    .from("managers")
    .select("id, name, role_title, email, source_code, parent_manager_id, can_manage_employees, can_add_actions, can_edit_actions, can_delete_actions, can_reassign_actions, can_sign_off_actions, can_manage_logins")
    .order("name");

  if (isMissingGranularPermissionsColumn(error)) {
    const compatibilityResult = await supabase
      .from("managers")
      .select("id, name, role_title, email, source_code, parent_manager_id, can_manage_employees")
      .order("name");
    data = compatibilityResult.data?.map((manager) => ({
      ...manager,
      can_add_actions: true,
      can_edit_actions: true,
      can_delete_actions: false,
      can_reassign_actions: true,
      can_sign_off_actions: true,
      can_manage_logins: Boolean(manager.can_manage_employees),
    })) ?? null;
    error = compatibilityResult.error;
  } else if (isMissingTeamHierarchyColumn(error)) {
    const legacyResult = await supabase
      .from("managers")
      .select("id, name, role_title, email, source_code")
      .order("name");
    data = legacyResult.data?.map((manager) => ({
      ...manager,
      parent_manager_id: null,
      can_manage_employees: false,
      can_add_actions: true,
      can_edit_actions: true,
      can_delete_actions: false,
      can_reassign_actions: true,
      can_sign_off_actions: true,
      can_manage_logins: false,
    })) ?? null;
    error = legacyResult.error;
  }

  if (error) throw new Error(error.message);
  const managers = (data ?? []) as Manager[];
  return isManager && managerId ? filterManagerTree(managers, managerId) : managers;
}

export async function getManagersWithProfiles(): Promise<ManagerDirectory> {
  const { supabase, isManager, managerId } = await requireTeamAdmin();

  const [
    initialManagersResult,
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase
      .from("managers")
      .select("id, name, role_title, email, source_code, parent_manager_id, can_manage_employees, can_add_actions, can_edit_actions, can_delete_actions, can_reassign_actions, can_sign_off_actions, can_manage_logins")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, display_name, role, manager_id"),
  ]);

  let { data: managers, error: managersError } = initialManagersResult;
  let teamHierarchyReady = true;
  let permissionsReady = true;
  if (isMissingGranularPermissionsColumn(managersError)) {
    permissionsReady = false;
    const compatibilityResult = await supabase
      .from("managers")
      .select("id, name, role_title, email, source_code, parent_manager_id, can_manage_employees")
      .order("name");
    managers = compatibilityResult.data?.map((manager) => ({
      ...manager,
      can_add_actions: true,
      can_edit_actions: true,
      can_delete_actions: false,
      can_reassign_actions: true,
      can_sign_off_actions: true,
      can_manage_logins: Boolean(manager.can_manage_employees),
    })) ?? null;
    managersError = compatibilityResult.error;
  } else if (isMissingTeamHierarchyColumn(managersError)) {
    teamHierarchyReady = false;
    permissionsReady = false;
    const legacyResult = await supabase
      .from("managers")
      .select("id, name, role_title, email, source_code")
      .order("name");
    managers = legacyResult.data?.map((manager) => ({
      ...manager,
      parent_manager_id: null,
      can_manage_employees: false,
      can_add_actions: true,
      can_edit_actions: true,
      can_delete_actions: false,
      can_reassign_actions: true,
      can_sign_off_actions: true,
      can_manage_logins: false,
    })) ?? null;
    managersError = legacyResult.error;
  }

  if (managersError) throw new Error(managersError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileByManagerId = new Map(
    (profiles ?? [])
      .filter((p) => p.manager_id)
      .map((p) => [p.manager_id as string, p])
  );

  const scopedManagers = isManager && managerId
    ? filterManagerTree(managers ?? [], managerId)
    : (managers ?? []);

  const mergedManagers = scopedManagers.map((manager) => {
    const linkedProfile = profileByManagerId.get(manager.id);
    return {
      id: manager.id,
      name: manager.name,
      role_title: manager.role_title,
      source_code: (manager as unknown as { source_code?: string }).source_code ?? null,
      email: manager.email ?? null,
      parent_manager_id: manager.parent_manager_id ?? null,
      can_manage_employees: Boolean(manager.can_manage_employees),
      can_add_actions: manager.can_add_actions !== false,
      can_edit_actions: manager.can_edit_actions !== false,
      can_delete_actions: Boolean(manager.can_delete_actions),
      can_reassign_actions: manager.can_reassign_actions !== false,
      can_sign_off_actions: manager.can_sign_off_actions !== false,
      can_manage_logins: Boolean(manager.can_manage_logins),
      profile_id: linkedProfile?.id || null,
      profile: linkedProfile
        ? {
            id: linkedProfile.id,
            display_name: linkedProfile.display_name,
            role: linkedProfile.role,
          }
        : null,
    };
  });

  return { managers: mergedManagers, teamHierarchyReady, permissionsReady };
}

function filterManagerTree<T extends { id: string; parent_manager_id?: string | null }>(
  managers: T[],
  rootManagerId: string
) {
  const allowed = new Set<string>([rootManagerId]);
  let added = true;

  while (added) {
    added = false;
    for (const manager of managers) {
      if (
        !allowed.has(manager.id) &&
        manager.parent_manager_id &&
        allowed.has(manager.parent_manager_id)
      ) {
        allowed.add(manager.id);
        added = true;
      }
    }
  }

  return managers.filter((manager) => allowed.has(manager.id));
}

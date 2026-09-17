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

  return {
    supabase,
    profile: profile as Profile,
    isDirector: profile.role === "director",
    isManager: profile.role === "manager",
    managerId: (profile.manager_id as string | null) ?? null,
  };
}

export async function requireDirector() {
  const auth = await requireAuth();
  if (!auth.isDirector) redirect("/access-pending");
  return { supabase: auth.supabase, profile: auth.profile };
}

export async function getActions(managerIdFilter?: string): Promise<ActionRecord[]> {
  const { supabase, isDirector, isManager, managerId } = await requireAuth();
  const { data, error } = await supabase
    .from("actions")
    .select(
      "*, workstream:workstreams(id, name), participants:action_participants(id,responsibility_type,responsibility_text,manager:managers(id,name,role_title)), updates:action_updates(*), signoffs:action_signoffs(id,signed_off_at,signed_off_by_name)"
    )
    .order("reference");

  if (error) throw new Error(error.message);

  let actions = (data ?? []) as unknown as ActionRecord[];

  if (isManager) {
    if (!managerId) return [];
    return actions.filter((action) =>
      action.participants?.some((p) => p.manager?.id === managerId)
    );
  }

  if (isDirector && managerIdFilter) {
    return actions.filter((action) =>
      action.participants?.some((p) => p.manager?.id === managerIdFilter)
    );
  }

  return actions;
}

export async function getActionById(id: string): Promise<ActionRecord | null> {
  const { supabase, isManager, profile } = await requireAuth();
  const { data, error } = await supabase
    .from("actions")
    .select(
      "*, workstream:workstreams(id, name), participants:action_participants(id,responsibility_type,responsibility_text,manager:managers(id,name,role_title)), updates:action_updates(*), signoffs:action_signoffs(id,signed_off_at,signed_off_by_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const action = data as unknown as ActionRecord;

  if (isManager) {
    if (!profile.manager_id) return null;
    const isParticipant = action.participants?.some(
      (p) => p.manager?.id === profile.manager_id
    );
    if (!isParticipant) return null;
  }

  return action;
}

export async function getWorkstreams(): Promise<Workstream[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.from("workstreams").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Workstream[];
}

export async function getManagers(): Promise<Manager[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("managers")
    .select("id, name, role_title, email, source_code")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Manager[];
}

export async function getManagersWithProfiles(): Promise<ManagerWithProfile[]> {
  const { supabase } = await requireDirector();

  const [
    { data: managers, error: managersError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase
      .from("managers")
      .select("id, name, role_title, email, source_code")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, display_name, role, manager_id"),
  ]);

  if (managersError) throw new Error(managersError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileByManagerId = new Map(
    (profiles ?? [])
      .filter((p) => p.manager_id)
      .map((p) => [p.manager_id as string, p])
  );

  return (managers ?? []).map((manager) => {
    const linkedProfile = profileByManagerId.get(manager.id);
    return {
      id: manager.id,
      name: manager.name,
      role_title: manager.role_title,
      source_code: (manager as unknown as { source_code?: string }).source_code ?? null,
      email: manager.email ?? null,
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
}

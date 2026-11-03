import { requireSettingsAccess } from "@/lib/auth";
import { getWorkspaceUsers, type WorkspaceUser } from "@/lib/workspace-users";
import type { Home } from "@/lib/types";
import { getManagersWithProfiles, type ManagerWithProfile } from "@/workbook/lib/data";

export type ConfigPerson = {
  key: string;
  name: string;
  email: string;
  role: string;
  user: WorkspaceUser | null;
  manager: ManagerWithProfile | null;
};

export async function getConfigDirectory() {
  const [users, managerDirectory, { context, supabase }] = await Promise.all([
    getWorkspaceUsers(),
    getManagersWithProfiles(),
    requireSettingsAccess(),
  ]);
  const homesResult = await supabase.from("qa_homes").select("*").order("name");
  if (homesResult.error) throw new Error(homesResult.error.message);

  const usersById = new Map(users.map(user => [user.id, user]));
  const includedUserIds = new Set<string>();
  const scopedManagers = context.role === "director" ? managerDirectory.managers : managerDirectory.managers.filter(manager =>
    manager.id === context.managerId || manager.parent_manager_id === context.managerId);
  const managerPeople: ConfigPerson[] = scopedManagers.map(manager => {
    const user = manager.profile_id ? usersById.get(manager.profile_id) ?? null : null;
    if (user) includedUserIds.add(user.id);
    return {
      key: `manager:${manager.id}`,
      name: manager.name,
      email: manager.email ?? user?.email ?? "",
      role: manager.profile?.role === "director" ? "Director" : "Manager",
      user,
      manager,
    };
  });
  const otherPeople: ConfigPerson[] = users.filter(user => context.role === "director" && !includedUserIds.has(user.id)).map(user => ({
    key: `user:${user.id}`,
    name: user.name,
    email: user.email,
    role: user.role,
    user,
    manager: null,
  }));

  return {
    people: [...managerPeople, ...otherPeople].sort((a, b) => a.name.localeCompare(b.name)),
    managers: scopedManagers,
    permissionsReady: managerDirectory.permissionsReady,
    teamHierarchyReady: managerDirectory.teamHierarchyReady,
    homes: (homesResult.data as Home[]).filter(home => context.role === "director" || context.homes.some(assigned => assigned.id === home.id)),
    currentUserId: context.userId,
    actor: context,
  };
}

import type { ActionState } from "@/app/actions";
import { saveSettingsForm } from "@/lib/settings-save";

export type PermissionKind = "panels" | "workbook" | "qa";

export const permissionSaveUnconfirmed = "The server could not confirm this change. Your selection is still here. Refresh and check the permissions before trying again.";

export async function savePermissionChange(kind: PermissionKind, data: FormData): Promise<ActionState> {
  data.set("kind", kind);
  return saveSettingsForm("/api/settings/permissions", data, permissionSaveUnconfirmed);
}

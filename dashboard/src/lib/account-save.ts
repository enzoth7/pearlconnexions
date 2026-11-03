import { saveSettingsForm } from "@/lib/settings-save";

export const accountSaveUnconfirmed = "The server could not confirm this change. Your entries are still here. Refresh the page and check the user before trying again.";

export function saveAccountChange(kind: "manager" | "qa", data: FormData) {
  data.set("kind", kind);
  return saveSettingsForm("/api/settings/accounts", data, accountSaveUnconfirmed);
}

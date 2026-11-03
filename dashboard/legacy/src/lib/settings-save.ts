import type { ActionState } from "@/app/actions";

export async function saveSettingsForm(endpoint: "/api/settings/permissions" | "/api/settings/accounts", data: FormData, unconfirmedMessage: string): Promise<ActionState> {
  try {
    const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", body: data });
    if (!response.headers.get("content-type")?.includes("application/json")) return { ok: false, message: unconfirmedMessage };
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("ok" in result) || typeof result.ok !== "boolean") {
      return { ok: false, message: unconfirmedMessage };
    }
    const ok = response.ok && result.ok;
    const message = "message" in result && typeof result.message === "string" ? result.message : undefined;
    return { ok, message: message ?? (ok ? undefined : unconfirmedMessage) };
  } catch {
    return { ok: false, message: unconfirmedMessage };
  }
}

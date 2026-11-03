import { supabase } from "./supabase";

export type PrivateResult = { ok: boolean; message?: string; managerId?: string };
export async function privateCall(operation: string, form: FormData): Promise<PrivateResult> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return { ok: false, message: "Sign in again to save changes." };
    const fields: Record<string, string | string[]> = Object.fromEntries(form.entries()) as Record<string, string>;
    for (const key of new Set(form.keys())) {
      if (form.getAll(key).length > 1 || key === "home_ids") fields[key] = form.getAll(key).map(String);
    }
    const response = await fetch("/api/private", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ operation, fields }) });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error();
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("ok" in result) || typeof result.ok !== "boolean") throw new Error();
    if (response.ok && result.ok) window.dispatchEvent(new Event("pearl:refresh"));
    return result as PrivateResult;
  } catch { return { ok: false, message: "The server could not confirm this change. Your entries are still here." }; }
}

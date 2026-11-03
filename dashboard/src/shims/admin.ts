import type { SupabaseClient } from "@supabase/supabase-js";
// Administrative credentials are never bundled into the browser application.
export function createAdminClient(): SupabaseClient | null { return null; }

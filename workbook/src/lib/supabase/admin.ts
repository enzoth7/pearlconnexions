import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

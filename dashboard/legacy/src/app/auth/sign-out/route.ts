import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response("This request must come from your workspace.", { status: 403 });
  }

  const switchMode = new URL(request.url).searchParams.get("switch");
  if (switchMode !== null && switchMode !== "1") {
    return new Response("Invalid account action.", { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return new Response("Could not sign out. Please try again.", { status: 502 });

  const destination = switchMode === "1" ? "/login?switch=1" : "/login";
  return NextResponse.redirect(new URL(destination, request.url), 303);
}

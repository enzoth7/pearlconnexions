import { workspaceReturnPath } from "@/lib/workspace-return";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/forgot-password", "/update-password", "/auth/confirm", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isPublic = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!data?.claims && !isPublic) {
    if (request.nextUrl.pathname.startsWith("/api/governance")) return NextResponse.json({ ok: false, message: "Your session has expired. Sign in again." }, { status: 401 });
    if (request.nextUrl.pathname === "/api/settings/permissions") {
      return NextResponse.json({ ok: false, message: "Your session has expired. Sign in again to save permissions." }, { status: 401 });
    }
    if (request.nextUrl.pathname === "/api/settings/accounts") {
      return NextResponse.json({ ok: false, message: "Your session has expired. Sign in again to save this user." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", workspaceReturnPath(request.nextUrl.pathname + request.nextUrl.search));
    return NextResponse.redirect(url);
  }
  if (data?.claims && request.nextUrl.pathname === "/login") {
    const target = workspaceReturnPath(request.nextUrl.searchParams.get("next"));
    const destination = NextResponse.redirect(new URL(target, request.url));
    for (const cookie of response.cookies.getAll()) destination.cookies.set(cookie);
    destination.headers.set("Cache-Control", "private, no-store");
    return destination;
  }
  return response;
}

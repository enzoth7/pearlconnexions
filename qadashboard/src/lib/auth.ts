import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Home } from "@/lib/types";

type MemberRow = {
  id: string;
  display_name: string;
  active: boolean;
  qa_member_homes: Array<{ qa_homes: Home | Home[] | null }>;
};

export type AccessContext = {
  userId: string;
  email: string;
  name: string;
  role: "director" | "house_lead" | "pending";
  homes: Home[];
};

export const getAccessContext = cache(async (): Promise<AccessContext | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const userId = String(claims.sub);
  const email = typeof claims.email === "string" ? claims.email : "";
  const [profileResult, memberResult] = await Promise.all([
    supabase.from("profiles").select("display_name, role").eq("id", userId).maybeSingle(),
    supabase
      .from("qa_members")
      .select("id, display_name, active, qa_member_homes(qa_homes(id,code,name,provision,total_beds,active))")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.data?.role === "director") {
    return {
      userId,
      email,
      name: profileResult.data.display_name || "Joel Samuel",
      role: "director",
      homes: [],
    };
  }

  const member = memberResult.data as MemberRow | null;
  const homes = (member?.qa_member_homes ?? []).flatMap((assignment) => {
    const value = assignment.qa_homes;
    return Array.isArray(value) ? value : value ? [value] : [];
  }).filter((home) => home.active);

  if (member?.active && homes.length > 0) {
    return { userId, email, name: member.display_name, role: "house_lead", homes };
  }
  return {
    userId,
    email,
    name: member?.display_name || email.split("@")[0] || "User",
    role: "pending",
    homes: [],
  };
});

export async function requireDirector() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.role === "house_lead") redirect("/portal");
  if (context.role !== "director") redirect("/access-pending");
  return { context, supabase: await createClient() };
}

export async function requireHouseLead() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.role === "director") redirect("/director");
  if (context.role !== "house_lead") redirect("/access-pending");
  return { context, supabase: await createClient() };
}

import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.role === "director") redirect("/director");
  if (context.role === "house_lead") redirect("/portal");
  redirect("/access-pending");
}

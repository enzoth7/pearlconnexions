import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";

export default async function TeamPage() {
  const context = await getAccessContext();
  if (context?.role === "director" || context?.canManageEmployees) redirect("/config/users");
  redirect("/workbook");
}

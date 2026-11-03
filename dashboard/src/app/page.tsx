import { redirect } from "next/navigation";
import { firstWorkspacePath } from "@/lib/workspace-sections";
import { getAccessContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  redirect(firstWorkspacePath(context));
}

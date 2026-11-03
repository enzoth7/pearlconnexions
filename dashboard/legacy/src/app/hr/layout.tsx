import { AppShell } from "@/components/app-shell";
import { requireWorkspaceArea } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const context = await requireWorkspaceArea("hr");
  return <AppShell context={context}>{children}</AppShell>;
}

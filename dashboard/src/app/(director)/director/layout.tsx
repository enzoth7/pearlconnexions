import { AppShell } from "@/components/app-shell";
import { requireDirector } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const { context } = await requireDirector();
  return <AppShell context={context}>{children}</AppShell>;
}

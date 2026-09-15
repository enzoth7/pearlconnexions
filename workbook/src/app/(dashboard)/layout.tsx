import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAuth();
  return (
    <AppShell name={profile.display_name || "Joel Samuel"} role={profile.role}>
      {children}
    </AppShell>
  );
}

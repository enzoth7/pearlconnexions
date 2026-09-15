import { AppShell } from "@/components/app-shell";
import { requireHouseLead } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { context } = await requireHouseLead();
  return <AppShell name={context.name} role="house_lead">{children}</AppShell>;
}

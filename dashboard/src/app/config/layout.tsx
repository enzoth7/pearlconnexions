import { AppShell } from "@/components/app-shell";
import { requireSettingsAccess } from "@/lib/auth";
import "@/app/workbook/workbook.css";

export const dynamic = "force-dynamic";

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  const { context } = await requireSettingsAccess();
  return <AppShell context={context}>{children}</AppShell>;
}

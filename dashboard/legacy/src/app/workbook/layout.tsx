import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import "./workbook.css";

export const dynamic = "force-dynamic";

export default async function WorkbookLayout({ children }: { children: React.ReactNode }) {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (!context.workbookRole) redirect("/");
  return <AppShell context={context}><div className="workbook-content">{children}</div></AppShell>;
}

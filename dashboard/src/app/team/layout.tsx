import { AppShell } from "@/components/app-shell";
import { requireGovernance } from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}) { const {context}=await requireGovernance("team"); return <AppShell context={context}>{children}</AppShell>; }

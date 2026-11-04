import { HrWorkspace } from "@/components/hr-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  const { context } = await requireSection("hr.overview");
  return <HrWorkspace mode="employees" canEdit={context.role === "director" || Boolean(context.canManageEmployees)} managerId={context.role === "director" ? null : context.managerId} />;
}

import { HrRecruitmentWorkspace } from "@/components/hr-recruitment-workspace";
import { requireSection } from "@/lib/auth";

export default async function Page() {
  const { context } = await requireSection("hr.recruitment");
  return <HrRecruitmentWorkspace canEdit={context.role === "director" || Boolean(context.canManageEmployees)} managerId={context.role === "director" ? null : context.managerId ?? null} />;
}

export const workspaceSectionGroups = [
  { id: "qa", label: "Quality & Governance", sections: [
    { id: "qa.overview", label: "Overview", href: "/qa" },
    { id: "qa.monthly_reports", label: "Reports", href: "/qa/monthly-reports" },
    { id: "qa.audits", label: "Audits", href: "/qa/audits" },
    { id: "qa.incidents", label: "Incidents", href: "/qa/incidents" },
    { id: "qa.follow_up", label: "Follow-up", href: "/qa/follow-up" },
    { id: "qa.recurrences", label: "Recurrences", href: "/qa/recurrences" },
    { id: "qa.risks", label: "Risk assessments", href: "/qa/risks" },
    { id: "qa.reviews", label: "Reviews", href: "/qa/reviews" },
    { id: "qa.homes", label: "Homes", href: "/qa/homes" },
  ] },
  { id: "workbook", label: "Workbook", sections: [
    { id: "workbook.overview", label: "Overview", href: "/workbook" },
    { id: "workbook.calendar", label: "Calendar", href: "/workbook/calendar" },
    { id: "workbook.actions", label: "Action register", href: "/workbook/actions" },
    { id: "workbook.reviews", label: "Action review", href: "/workbook/reviews" },
    { id: "workbook.archive", label: "Completed actions", href: "/workbook/archive" },
  ] },
  { id: "finance", label: "Finance", sections: [
    { id: "finance.overview", label: "Overview", href: "/finance" },
    { id: "finance.expenses", label: "Expenses", href: "/finance/expenses" },
    { id: "finance.payroll", label: "Payroll", href: "/finance/payroll" },
    { id: "finance.invoices", label: "Invoices", href: "/finance/invoices" },
  ] },
  { id: "hr", label: "HR", sections: [
    { id: "hr.overview", label: "Overview", href: "/hr" },
    { id: "hr.employees", label: "Employees", href: "/hr/employees" },
    { id: "hr.coverage", label: "Coverage", href: "/hr/coverage" },
    { id: "hr.recruitment", label: "Recruitment", href: "/hr/recruitment" },
  ] },
  { id: "maintenance", label: "Maintenance", sections: [
    { id: "maintenance.overview", label: "Overview", href: "/maintenance/overview" },
    { id: "maintenance.issues", label: "Issues", href: "/maintenance" },
    { id: "maintenance.checks", label: "Checks", href: "/maintenance/checks" },
    { id: "maintenance.historical", label: "Historical", href: "/maintenance/historical" },
  ] },
  { id: "team", label: "Team", sections: [{ id: "team.organisation_chart", label: "Organisation chart", href: "/team" }] },
  { id: "links", label: "Links", sections: [{ id: "links.quick_links", label: "Quick links", href: "/links" }] },
  { id: "settings", label: "Settings", sections: [
    { id: "settings.users_permissions", label: "Users & permissions", href: "/config/users" },
    { id: "settings.houses", label: "Houses", href: "/config/houses" },
    { id: "settings.activity_log", label: "Activity log", href: "/config/activity-log" },
  ] },
] as const;
export type WorkspaceSection = typeof workspaceSectionGroups[number]["sections"][number]["id"];
export const workspaceSectionIds = workspaceSectionGroups.flatMap(group => group.sections.map(section => section.id));
type SectionContext = { role?: string; isAdmin?: boolean; workbookRole?: string | null; qaEnabled?: boolean; finance?: boolean; hr?: boolean; maintenance?: boolean; canManageEmployees?: boolean; sections?: string[] };

export function canOpenSection(context: SectionContext, section: WorkspaceSection) {
  if (section === "settings.activity_log") return Boolean(context.sections?.includes(section));
  if (context.role === "director") return true;
  const area = section.split(".")[0];
  if (context.sections !== undefined) {
    const enabled = area === "qa" ? context.qaEnabled : area === "workbook" ? Boolean(context.workbookRole) : area === "team" || area === "links" || area === "settings" ? true : context[area as "finance" | "hr" | "maintenance"];
    return enabled !== false && context.sections.includes(section);
  }
  if (area === "qa") return Boolean(context.qaEnabled || context.role === "house_lead");
  if (area === "workbook") return Boolean(context.workbookRole);
  if (area === "links") return Boolean(context.workbookRole || context.qaEnabled || context.finance || context.hr || context.maintenance || context.isAdmin);
  if (area === "settings") return Boolean(context.isAdmin || context.canManageEmployees);
  return Boolean(context[area as "finance" | "hr" | "maintenance"]);
}

export function firstWorkspacePath(context: SectionContext) {
  if (context.role === "director") return "/qa";
  const qa = workspaceSectionGroups[0].sections.find(section => canOpenSection(context, section.id));
  if (qa) return qa.href;
  const workbook = workspaceSectionGroups.find(group => group.id === "workbook")!.sections.find(section => canOpenSection(context, section.id));
  if (workbook) return workbook.href;
  if (context.workbookRole && context.sections === undefined) return "/workbook";
  for (const group of workspaceSectionGroups.filter(group => group.id !== "links" && group.id !== "qa" && group.id !== "workbook")) {
    const section = group.sections.find(item => canOpenSection(context, item.id));
    if (section) return section.href;
  }
  return canOpenSection(context,"links.quick_links") ? "/links" : "/access-pending";
}

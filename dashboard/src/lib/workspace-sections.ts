export const workspaceSectionGroups = [
  { id: "qa", label: "Quality & Governance", sections: [
    { id: "qa.overview", label: "Overview", href: "/qa" },
    { id: "qa.monthly_reports", label: "Monthly reports", href: "/qa/monthly-reports" },
    { id: "qa.audits", label: "Audits", href: "/qa/audits" },
    { id: "qa.incidents", label: "Incidents", href: "/qa/incidents" },
    { id: "qa.risks", label: "Risk assessments", href: "/qa/risks" },
    { id: "qa.reviews", label: "Reviews", href: "/qa/reviews" },
    { id: "qa.homes", label: "Homes", href: "/qa/homes" },
  ] },
  { id: "finance", label: "Finance", sections: [{ id: "finance.overview", label: "Overview", href: "/finance" }] },
  { id: "hr", label: "HR", sections: [{ id: "hr.overview", label: "Overview", href: "/hr" }] },
  { id: "maintenance", label: "Maintenance", sections: [{ id: "maintenance.issues", label: "Issues", href: "/maintenance" }] },
  { id: "team", label: "Team", sections: [{ id: "team.organisation_chart", label: "Organisation chart", href: "/team" }] },
  { id: "links", label: "Links", sections: [{ id: "links.quick_links", label: "Quick links", href: "/links" }] },
] as const;
export type WorkspaceSection = typeof workspaceSectionGroups[number]["sections"][number]["id"];
export const workspaceSectionIds = workspaceSectionGroups.flatMap(group => group.sections.map(section => section.id));
type SectionContext = { role?: string; isAdmin?: boolean; workbookRole?: string | null; qaEnabled?: boolean; finance?: boolean; hr?: boolean; maintenance?: boolean; sections?: string[] };

export function canOpenSection(context: SectionContext, section: WorkspaceSection) {
  if (context.role === "director") return true;
  const area = section.split(".")[0];
  if (context.sections !== undefined) {
    const enabled = area === "qa" ? context.qaEnabled : area === "team" || area === "links" ? true : context[area as "finance" | "hr" | "maintenance"];
    return enabled !== false && context.sections.includes(section);
  }
  if (area === "qa") return Boolean(context.qaEnabled || context.role === "house_lead");
  if (area === "links") return Boolean(context.workbookRole || context.qaEnabled || context.finance || context.hr || context.maintenance || context.isAdmin);
  return Boolean(context[area as "finance" | "hr" | "maintenance"]);
}

export function firstWorkspacePath(context: SectionContext) {
  if (context.role === "director") return "/qa";
  const qa = workspaceSectionGroups[0].sections.find(section => canOpenSection(context, section.id));
  if (qa) return qa.href;
  if (context.workbookRole) return "/workbook";
  for (const group of workspaceSectionGroups.filter(group => group.id !== "links" && group.id !== "qa")) {
    const section = group.sections.find(item => canOpenSection(context, item.id));
    if (section) return section.href;
  }
  return canOpenSection(context,"links.quick_links") ? "/links" : "/access-pending";
}

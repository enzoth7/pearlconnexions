import type { ReactNode } from "react";
import type { AccessContext } from "./shims/auth";
import { canOpenSection, type WorkspaceSection } from "@/lib/workspace-sections";

type Route = { section?: WorkspaceSection; alternativeSection?: WorkspaceSection; load: (params: URLSearchParams, id?: string) => Promise<ReactNode>; workbook?: boolean; ownShell?: boolean };
const query = (params: URLSearchParams) => Object.fromEntries(params.entries());
const fromPage = async (source: Promise<{ default: (...args: never[]) => ReactNode | Promise<ReactNode> }>, args?: unknown) => (await source).default(args as never);

export const routes: Record<string, Route> = {
  "/qa": { section: "qa.overview", load: p => fromPage(import("../legacy/src/app/qa/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/qa/monthly-reports": { section: "qa.monthly_reports", load: () => fromPage(import("../legacy/src/app/qa/monthly-reports/page")) },
  "/qa/audits": { section: "qa.audits", load: () => fromPage(import("../legacy/src/app/qa/audits/page")) },
  "/qa/incidents": { section: "qa.incidents", load: p => fromPage(import("../legacy/src/app/qa/incidents/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/qa/recurrences": { section: "qa.recurrences", load: () => fromPage(import("../legacy/src/app/qa/recurrences/page")) },
  "/qa/follow-up": { section: "qa.follow_up", load: () => fromPage(import("../legacy/src/app/qa/follow-up/page")) },
  "/qa/risks": { section: "qa.risks", load: p => fromPage(import("../legacy/src/app/qa/risks/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/qa/reviews": { section: "qa.reviews", load: () => fromPage(import("../legacy/src/app/qa/reviews/page")) },
  "/qa/homes": { section: "qa.homes", load: () => fromPage(import("../legacy/src/app/qa/homes/page")) },
  "/qa/monthly-reports/:id": { section: "qa.monthly_reports", alternativeSection: "qa.reviews", load: (_p, id) => fromPage(import("../legacy/src/app/qa/monthly-reports/[id]/page"), { params: Promise.resolve({ id }) }) },
  "/director/reviews/:id": { section: "qa.reviews", load: (p, id) => fromPage(import("../legacy/src/app/(director)/director/reviews/[id]/page"), { params: Promise.resolve({ id }), searchParams: Promise.resolve(query(p)) }) },
  "/portal/submissions/:id": { section: "qa.monthly_reports", load: (_p, id) => fromPage(import("../legacy/src/app/(portal)/portal/submissions/[id]/page"), { params: Promise.resolve({ id }) }) },
  "/maintenance": { section: "maintenance.issues", load: () => fromPage(import("../legacy/src/app/maintenance/page")) },
  "/maintenance/dashboard": { section: "maintenance.overview", load: () => fromPage(import("../legacy/src/app/maintenance/dashboard/page")) },
  "/maintenance/historical": { section: "maintenance.historical", load: () => fromPage(import("../legacy/src/app/maintenance/historical/page")) },
  "/maintenance/overview": { section: "maintenance.overview", load: () => fromPage(import("../legacy/src/app/maintenance/overview/page")) },
  "/maintenance/checks": { section: "maintenance.checks", load: () => fromPage(import("../legacy/src/app/maintenance/checks/page")) },
  "/team": { section: "team.organisation_chart", load: () => fromPage(import("../legacy/src/app/team/page")) },
  "/finance": { section: "finance.overview", load: () => fromPage(import("../legacy/src/app/finance/page")) },
  "/finance/expenses": { section: "finance.expenses", load: () => fromPage(import("../legacy/src/app/finance/expenses/page")) },
  "/finance/payroll": { section: "finance.payroll", load: () => fromPage(import("../legacy/src/app/finance/payroll/page")) },
  "/finance/invoices": { section: "finance.invoices", load: () => fromPage(import("../legacy/src/app/finance/invoices/page")) },
  "/hr": { section: "hr.overview", load: () => fromPage(import("../legacy/src/app/hr/page")) },
  "/hr/employees": { section: "hr.employees", load: () => fromPage(import("../legacy/src/app/hr/employees/page")) },
  "/hr/coverage": { section: "hr.coverage", load: () => fromPage(import("../legacy/src/app/hr/coverage/page")) },
  "/hr/recruitment": { section: "hr.recruitment", load: () => fromPage(import("../legacy/src/app/hr/recruitment/page")) },
  "/links": { section: "links.quick_links", ownShell: true, load: () => fromPage(import("../legacy/src/app/links/page")) },
  "/config/users": { section: "settings.users_permissions", load: p => fromPage(import("../legacy/src/app/config/users/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/config/permissions": { section: "settings.users_permissions", load: p => fromPage(import("../legacy/src/app/config/permissions/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/config/houses": { section: "settings.houses", load: () => fromPage(import("../legacy/src/app/config/houses/page")) },
  "/config/activity-log": { section: "settings.activity_log", load: () => fromPage(import("../legacy/src/app/config/activity-log/page")) },
  "/workbook": { section: "workbook.overview", workbook: true, load: p => fromPage(import("../legacy/src/app/workbook/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/workbook/actions": { section: "workbook.actions", workbook: true, load: p => fromPage(import("../legacy/src/app/workbook/actions/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/workbook/actions/:id": { section: "workbook.actions", workbook: true, load: (_p, id) => fromPage(import("../legacy/src/app/workbook/actions/[id]/page"), { params: Promise.resolve({ id }) }) },
  "/workbook/calendar": { section: "workbook.calendar", workbook: true, load: () => fromPage(import("../legacy/src/app/workbook/calendar/page")) },
  "/workbook/reviews": { section: "workbook.reviews", workbook: true, load: p => fromPage(import("../legacy/src/app/workbook/reviews/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/workbook/archive": { section: "workbook.archive", workbook: true, load: () => fromPage(import("../legacy/src/app/workbook/archive/page")) },
  "/login": { ownShell: true, load: p => fromPage(import("../legacy/src/app/login/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/forgot-password": { ownShell: true, load: () => fromPage(import("../legacy/src/app/forgot-password/page")) },
  "/update-password": { ownShell: true, load: () => fromPage(import("../legacy/src/app/update-password/page")) },
  "/access-pending": { ownShell: true, load: () => fromPage(import("../legacy/src/app/access-pending/page")) },
};

export function matchRoute(pathname: string): { route: Route; id?: string } | null {
  const direct = routes[pathname];
  if (direct) return { route: direct };
  for (const [pattern, route] of Object.entries(routes)) {
    if (!pattern.endsWith("/:id")) continue;
    const prefix = pattern.slice(0, -4);
    if (pathname.startsWith(prefix) && pathname.slice(prefix.length).match(/^\/[^/]+$/)) return { route, id: decodeURIComponent(pathname.slice(prefix.length + 1)) };
  }
  return null;
}

export function canLoadRoute(context: AccessContext | null, route: Route): boolean {
  if (!route.section) return true;
  if (!context) return false;
  return canOpenSection(context, route.section) || Boolean(route.alternativeSection && canOpenSection(context, route.alternativeSection));
}

export function preloadPaths(context: AccessContext): string[] {
  return Object.entries(routes).filter(([path, route]) => !path.includes(":id") && (!route.ownShell || path === "/links") && canLoadRoute(context, route)).map(([path]) => path);
}

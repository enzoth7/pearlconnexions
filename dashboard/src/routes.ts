import type { ReactNode } from "react";
import type { AccessContext } from "./shims/auth";
import { canOpenSection, type WorkspaceSection } from "@/lib/workspace-sections";

type Route = { section?: WorkspaceSection | "workbook"; alternativeSection?: WorkspaceSection; load: (params: URLSearchParams, id?: string) => Promise<ReactNode>; workbook?: boolean; ownShell?: boolean };
const query = (params: URLSearchParams) => Object.fromEntries(params.entries());
const fromPage = async (source: Promise<{ default: (...args: never[]) => ReactNode | Promise<ReactNode> }>, args?: unknown) => (await source).default(args as never);

export const routes: Record<string, Route> = {
  "/qa": { section: "qa.overview", load: () => fromPage(import("../legacy/src/app/qa/page")) },
  "/qa/monthly-reports": { section: "qa.monthly_reports", load: () => fromPage(import("../legacy/src/app/qa/monthly-reports/page")) },
  "/qa/audits": { section: "qa.audits", load: () => fromPage(import("../legacy/src/app/qa/audits/page")) },
  "/qa/incidents": { section: "qa.incidents", load: () => fromPage(import("../legacy/src/app/qa/incidents/page")) },
  "/qa/risks": { section: "qa.risks", load: () => fromPage(import("../legacy/src/app/qa/risks/page")) },
  "/qa/reviews": { section: "qa.reviews", load: () => fromPage(import("../legacy/src/app/qa/reviews/page")) },
  "/qa/homes": { section: "qa.homes", load: () => fromPage(import("../legacy/src/app/qa/homes/page")) },
  "/qa/monthly-reports/:id": { section: "qa.monthly_reports", alternativeSection: "qa.reviews", load: (_p, id) => fromPage(import("../legacy/src/app/qa/monthly-reports/[id]/page"), { params: Promise.resolve({ id }) }) },
  "/director/reviews/:id": { section: "qa.reviews", load: (p, id) => fromPage(import("../legacy/src/app/(director)/director/reviews/[id]/page"), { params: Promise.resolve({ id }), searchParams: Promise.resolve(query(p)) }) },
  "/portal/submissions/:id": { section: "qa.monthly_reports", load: (_p, id) => fromPage(import("../legacy/src/app/(portal)/portal/submissions/[id]/page"), { params: Promise.resolve({ id }) }) },
  "/maintenance": { section: "maintenance.issues", load: () => fromPage(import("../legacy/src/app/maintenance/page")) },
  "/team": { section: "team.organisation_chart", load: () => fromPage(import("../legacy/src/app/team/page")) },
  "/finance": { section: "finance.overview", load: () => fromPage(import("../legacy/src/app/finance/page")) },
  "/hr": { section: "hr.overview", load: () => fromPage(import("../legacy/src/app/hr/page")) },
  "/links": { section: "links.quick_links", ownShell: true, load: () => fromPage(import("../legacy/src/app/links/page")) },
  "/config/users": { section: "settings.users_permissions", load: p => fromPage(import("../legacy/src/app/config/users/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/config/permissions": { section: "settings.users_permissions", load: p => fromPage(import("../legacy/src/app/config/permissions/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/config/houses": { section: "settings.houses", load: () => fromPage(import("../legacy/src/app/config/houses/page")) },
  "/config/activity-log": { section: "settings.activity_log", load: () => fromPage(import("../legacy/src/app/config/activity-log/page")) },
  "/workbook": { section: "workbook", workbook: true, load: p => fromPage(import("../legacy/src/app/workbook/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/workbook/actions": { section: "workbook", workbook: true, load: p => fromPage(import("../legacy/src/app/workbook/actions/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/workbook/actions/:id": { section: "workbook", workbook: true, load: (_p, id) => fromPage(import("../legacy/src/app/workbook/actions/[id]/page"), { params: Promise.resolve({ id }) }) },
  "/workbook/calendar": { section: "workbook", workbook: true, load: () => fromPage(import("../legacy/src/app/workbook/calendar/page")) },
  "/workbook/reviews": { section: "workbook", workbook: true, load: p => fromPage(import("../legacy/src/app/workbook/reviews/page"), { searchParams: Promise.resolve(query(p)) }) },
  "/workbook/archive": { section: "workbook", workbook: true, load: () => fromPage(import("../legacy/src/app/workbook/archive/page")) },
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
  return route.section === "workbook" ? Boolean(context.workbookRole) : canOpenSection(context, route.section) || Boolean(route.alternativeSection && canOpenSection(context, route.alternativeSection));
}

export function preloadPaths(context: AccessContext): string[] {
  return Object.entries(routes).filter(([path, route]) => !path.includes(":id") && (!route.ownShell || path === "/links") && canLoadRoute(context, route)).map(([path]) => path);
}

import { loadReportRows as original } from "../../legacy/src/lib/qa-report-rows";
import { cached } from "./cache";
import type { WorkspaceSection } from "@/lib/workspace-sections";
export function loadReportRows(section: Extract<WorkspaceSection, "qa.overview" | "qa.monthly_reports" | "qa.reviews"> = "qa.monthly_reports") {
  return cached(`qa:reports:${section}`, () => original(section));
}

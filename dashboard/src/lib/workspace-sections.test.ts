import { describe, expect, it } from "vitest";
import { canOpenSection, firstWorkspacePath } from "./workspace-sections";

describe("workspace section access", () => {
  it("allows only the selected QA subtab even when QA is enabled", () => {
    const manager = { role: "house_lead", qaEnabled: true, workbookRole: "manager", sections: ["qa.monthly_reports"] };
    expect(canOpenSection(manager, "qa.monthly_reports")).toBe(true);
    expect(canOpenSection(manager, "qa.overview")).toBe(false);
    expect(canOpenSection(manager, "qa.incidents")).toBe(false);
    expect(firstWorkspacePath(manager)).toBe("/qa/monthly-reports");
  });
  it("does not treat an empty list as legacy full access", () => {
    expect(canOpenSection({ role: "house_lead", qaEnabled: true, sections: [] }, "qa.monthly_reports")).toBe(false);
    expect(firstWorkspacePath({ sections: [] })).toBe("/access-pending");
  });
  it("allows Reviews and Team when explicitly selected", () => {
    expect(canOpenSection({ role: "manager", sections: ["qa.reviews", "team.organisation_chart"] }, "qa.reviews")).toBe(true);
    expect(canOpenSection({ role: "manager", sections: ["team.organisation_chart"] }, "team.organisation_chart")).toBe(true);
    expect(canOpenSection({ role: "manager", sections: [] }, "team.organisation_chart")).toBe(false);
    expect(canOpenSection({ role: "director", sections: [] }, "qa.reviews")).toBe(true);
  });
  it("uses the first permitted page rather than redirecting to a hidden overview", () => {
    expect(firstWorkspacePath({ qaEnabled: true, sections: ["qa.incidents"] })).toBe("/qa/incidents");
    expect(firstWorkspacePath({ workbookRole: "manager", sections: ["links.quick_links"] })).toBe("/workbook");
  });
});

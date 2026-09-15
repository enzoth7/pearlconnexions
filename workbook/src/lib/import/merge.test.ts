import { describe, expect, it } from "vitest";
import { mergeWorkbookRows, type WorkbookRow } from "./merge";

const row = (values: Partial<WorkbookRow>): WorkbookRow => ({ reference: "BD01", workstream: "Business Development", title: "Develop the plan", responsibilityType: "Owner", manager: "Owner Manager", priority: "High", baseStatus: "Not Started", ...values });

describe("mergeWorkbookRows", () => {
  it("uses the owner wording and preserves participant responsibilities", () => {
    const result = mergeWorkbookRows([row({ responsibilityType: "Support", manager: "Support Manager", title: "Support the plan", workstream: null, priority: null }), row({})]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Develop the plan");
    expect(result[0].participants).toHaveLength(2);
  });
  it("keeps QA02 as one action with distinct manager responsibilities", () => {
    const result = mergeWorkbookRows([row({ reference: "QA02", title: "Children's Home KPIs", manager: "Mike", responsibilityType: "Collective SMT owner" }), row({ reference: "QA02", title: "Workforce KPIs", manager: "Simmone", responsibilityType: "Collective SMT owner" })]);
    expect(result[0].title).toContain("each leadership area");
    expect(result[0].participants.map((item) => item.responsibility)).toEqual(["Children's Home KPIs", "Workforce KPIs"]);
  });
  it("inherits a missing workstream from the reference prefix", () => {
    const result = mergeWorkbookRows([row({ reference: "SA01", workstream: "Supported Accommodation" }), row({ reference: "SA05", workstream: null, responsibilityType: "Support" })]);
    expect(result.find((item) => item.reference === "SA05")?.workstream).toBe("Supported Accommodation");
  });
});

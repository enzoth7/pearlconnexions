// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QaFollowUp } from "../legacy/src/components/qa-follow-up";
import { QaCaseTable } from "../legacy/src/components/qa-case-table";
import { caseDataSchema, type CaseRecord } from "../legacy/src/lib/qa-capture";

const home = { id: "00000000-0000-4000-8000-000000000101", code: "CH901", name: "Example home", address: null, provision: "Supported Living" as const, total_beds: null, active: true };
const incident: CaseRecord = {
  id: "00000000-0000-4000-8000-000000000201", reference: "INC-0013", version: 1, kind: "incidents", home_id: home.id,
  occurred_on: "2026-11-03", title: "Medication support concern", status: "Follow up", is_draft: false, schema_version: 2,
  data: caseDataSchema.parse({ safeguarding: "yes", category: "Medication", priority: "High" }),
  actions: [{ id: "00000000-0000-4000-8000-000000000301", description: "Check the records", owner: "Home manager", due_on: "2026-11-04", status: "Pending", completed_on: "", resolution: "" }], reviews: [],
};
afterEach(cleanup);

describe("Quality follow-up", () => {
  it("lists existing actions and opens their source incident", () => {
    render(<QaFollowUp homes={[home]} records={[incident]} />);
    expect(screen.getByText("Check the records")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open INC-0013" }).getAttribute("href")).toBe(`/qa/incidents?record=${incident.id}`);
  });

  it("shows a safeguarding column and applies an incoming filter", () => {
    const other = { ...incident, id: "00000000-0000-4000-8000-000000000202", reference: "INC-0014", title: "Another incident", data: { ...incident.data, safeguarding: "no" as const } };
    render(<QaCaseTable kind="incidents" homes={[home]} records={[incident, other]} people={[]} initialSafeguardingFilter="yes" onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: "Filter Safeguarding" })).toBeTruthy();
    expect(screen.getByText("Medication support concern")).toBeTruthy();
    expect(screen.queryByText("Another incident")).toBeNull();
  });
});

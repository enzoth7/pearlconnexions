import { describe, expect, it } from "vitest";
import { buildRecurrences } from "../legacy/src/lib/qa-recurrences";
import { caseDataSchema, type CaseRecord, type Person } from "../legacy/src/lib/qa-capture";

const homeA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const homeB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const personA = "11111111-1111-4111-8111-111111111111";
const personB = "22222222-2222-4222-8222-222222222222";
const people = [
  { id: personA, home_id: homeA, code: "P-1", alias: "Example 1", active: true, version: 1 },
  { id: personB, home_id: homeB, code: "P-1", alias: "Example 1", active: true, version: 1 },
] as Person[];
function incident(id: string, homeId: string, ids: string[], date: string, category: string, status = "Monitoring", draft = false): CaseRecord {
  return { id, version: 1, kind: "incidents", home_id: homeId, occurred_on: date, title: category, status, is_draft: draft, schema_version: 2,
    data: caseDataSchema.parse({ person_ids: ids, involvement: "identified", category }), actions: [], reviews: [] };
}

describe("incident recurrences", () => {
  it("counts only registered incidents and keeps identical aliases in different homes separate", () => {
    const rows = buildRecurrences([
      incident("a", homeA, [personA], "2026-10-03", "Medication"),
      incident("b", homeA, [personA], "2026-11-02", "Missing / absence", "Closed"),
      incident("c", homeA, [personA], "2026-11-03", "Assault", "Monitoring", true),
      incident("d", homeB, [personB], "2026-10-04", "Medication"),
    ], people);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ homeId: homeA, person: "Example 1", latest: "2026-11-02", openFollowUps: 1, types: ["Medication", "Missing / absence"] });
    expect(rows[0].incidents.map(row => row.id)).toEqual(["b", "a"]);
  });

  it("attributes a multi-person incident to each identified person once", () => {
    const rows = buildRecurrences([
      incident("a", homeA, [personA, personA], "2026-10-03", "Medication"),
      incident("b", homeA, [personA], "2026-10-04", "Medication"),
    ], people);
    expect(rows).toHaveLength(1);
    expect(rows[0].incidents).toHaveLength(2);
  });
});

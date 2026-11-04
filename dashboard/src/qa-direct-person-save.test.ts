import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCase } from "../legacy/src/lib/qa-capture";
import { saveCase } from "../legacy/src/lib/qa-cases-client";

const database = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("./shims/supabase", () => ({ supabase: database }));
vi.mock("@/lib/auth", () => ({ requireGovernance: vi.fn() }));

const homeId = "00000000-0000-4000-8000-000000000101";
const person = { id: "00000000-0000-4000-8000-000000000201", home_id: homeId, code: "P-A1", alias: "Example One", active: true, version: 1 };

function mockPeople(rows: typeof person[]) {
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: person, error: null }) }) }));
  database.from.mockReturnValue({ select: () => ({ eq: async () => ({ data: rows, error: null }) }), insert });
  database.rpc.mockResolvedValue({ error: null });
  return insert;
}

beforeEach(() => vi.clearAllMocks());

describe("direct person entry", () => {
  it("creates an internal identity when registering a risk by name", async () => {
    const insert = mockPeople([]);
    const record = emptyCase("risks", homeId);
    record.is_draft = false;
    record.title = "Individual absence risk";
    Object.assign(record.data, { person_name: "Example One", description: "Missing from home", category: "Missing / absence", priority: "Moderate", initial_level: "High", evaluator: "Manager", controls: "Agreed plan", owner: "Manager", due_on: "2026-11-10" });
    expect((await saveCase(record)).ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ home_id: homeId, alias: "Example One" }));
    expect(database.rpc.mock.calls[0][1].content.data.person_ids).toEqual([person.id]);
  });

  it("reuses the same home's existing identity for an incident", async () => {
    const insert = mockPeople([person]);
    const record = emptyCase("incidents", homeId);
    record.is_draft = false;
    record.title = "Late return";
    Object.assign(record.data, { person_name: "Example One", involvement: "identified", description: "Late return to home", category: "Missing / absence", priority: "Moderate", occurred_local: "2026-11-03T10:00", reporter: "Manager", action_taken: "Confirmed safe return", owner: "Manager", due_on: "2026-11-10" });
    expect((await saveCase(record)).ok).toBe(true);
    expect(insert).not.toHaveBeenCalled();
    expect(database.rpc.mock.calls[0][1].content.data.person_ids).toEqual([person.id]);
  });
});

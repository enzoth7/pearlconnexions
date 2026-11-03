import { describe, expect, it, vi } from "vitest";
import {
  effectiveStatus,
  matchesDeadlineWindow,
  nextActionReference,
  type ActionRecord,
} from "./utils";

const action = (value: Partial<ActionRecord>): ActionRecord => ({
  id: "1",
  reference: "AA01",
  title: "Action",
  workstream_id: "1",
  workstream: null,
  priority: null,
  base_status: "Not Started",
  date_added: null,
  deadline: null,
  extended_deadline: null,
  completed_at: null,
  participants: [],
  ...value,
});

describe("effectiveStatus", () => {
  it("prioritises completion", () => {
    expect(effectiveStatus(action({ completed_at: "2026-01-01", deadline: "2025-01-01" }))).toBe("Completed");
  });

  it("marks passed deadlines overdue", () => {
    vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
    expect(effectiveStatus(action({ deadline: "2026-09-01" }))).toBe("Overdue");
    vi.useRealTimers();
  });

  it("marks future extensions", () => {
    vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
    expect(effectiveStatus(action({ deadline: "2026-09-01", extended_deadline: "2026-09-20" }))).toBe("Extended");
    vi.useRealTimers();
  });
});

describe("nextActionReference", () => {
  it("continues the workstream's established prefix", () => {
    expect(nextActionReference("Business Development", ["BD01", "BD02"], ["BD01", "BD02", "QA01"])).toBe("BD03");
  });

  it("derives a prefix for a new workstream", () => {
    expect(nextActionReference("Children's Home", [], ["BD01"])).toBe("CH01");
  });

  it("skips a reference already used elsewhere", () => {
    expect(nextActionReference("Supported Living", ["SL01"], ["SL01", "SL02"])).toBe("SL03");
  });
});

describe("matchesDeadlineWindow", () => {
  const today = "2026-10-09";

  it("uses Monday to Sunday for weekly deadlines", () => {
    expect(matchesDeadlineWindow(action({ deadline: "2026-10-05" }), "this-week", today)).toBe(true);
    expect(matchesDeadlineWindow(action({ deadline: "2026-10-11" }), "this-week", today)).toBe(true);
    expect(matchesDeadlineWindow(action({ deadline: "2026-10-12" }), "next-week", today)).toBe(true);
  });

  it("uses the extended deadline when present", () => {
    expect(matchesDeadlineWindow(action({ deadline: "2026-10-09", extended_deadline: "2026-11-03" }), "next-month", today)).toBe(true);
  });

  it("can show actions without a deadline", () => {
    expect(matchesDeadlineWindow(action({ deadline: null }), "no-deadline", today)).toBe(true);
  });
});

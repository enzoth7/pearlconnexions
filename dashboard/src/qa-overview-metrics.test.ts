import { describe, expect, it } from "vitest";
import { averageOccupiedBeds, measureTotals, overdueDate, reportedOccupiedBeds, totalsForCodes } from "../legacy/src/lib/qa-overview-metrics";
import type { Measurement } from "../legacy/src/lib/qa-capture";

const measure = (expected: string, completed: string, na = false): Measurement => ({ expected, completed, na, note: "" });

describe("QA overview quantities", () => {
  it("counts only submitted, applicable quantities supplied to the overview", () => {
    const totals = measureTotals([
      { measurements: { daily_records: measure("20", "18"), supervisions: measure("4", "4"), fire_drills: measure("", "", true) } },
      { measurements: { daily_records: measure("10", "9"), supervisions: measure("0", "0"), fire_drills: measure("2", "1") } },
      { measurements: { daily_records: measure("bad", "7"), supervisions: measure("3", "4") } },
    ]);
    expect(totalsForCodes(totals, ["daily_records"])).toEqual({ expected: 30, completed: 27, ratio: 0.9 });
    expect(totalsForCodes(totals, ["fire_drills"])).toEqual({ expected: 2, completed: 1, ratio: 0.5 });
    expect(totalsForCodes(totals, ["first_aid"])).toEqual({ expected: 0, completed: 0, ratio: null });
  });

  it("treats missing due dates as unknown and compares real dates only", () => {
    expect(overdueDate("", "2026-11-04")).toBe(false);
    expect(overdueDate("2026-11-03", "2026-11-04")).toBe(true);
    expect(overdueDate("2026-11-04", "2026-11-04")).toBe(false);
  });

  it("reports occupied beds only where a submitted form supplied a valid monthly average", () => {
    expect(averageOccupiedBeds({ occupied_beds: "0" })).toBe(0);
    expect(reportedOccupiedBeds([{ occupied_beds: "3.5" }, { occupied_beds: "4" }, { occupied_beds: "" }, { occupied_beds: "unknown" }]))
      .toEqual({ total: 7.5, homes: 2 });
  });
});

import { describe, expect, it } from "vitest";
import { calculateKpis, difference, formatAlertGap, highestRisk, isOverdue, safeRatio, weightedCompletion } from "./calculations";

describe("QA calculations", () => {
  it("keeps missing values as null", () => {
    expect(safeRatio(null, 10)).toBeNull();
    expect(safeRatio(0, null)).toBeNull();
    expect(difference(null, 2)).toBeNull();
  });

  it("allows actual to exceed expected", () => {
    expect(safeRatio(12, 10)).toBe(1.2);
    expect(weightedCompletion([
      { metric_code: "A", expected: 10, actual: 12 },
      { metric_code: "B", expected: 5, actual: 4 },
    ])).toBeCloseTo(16 / 15);
  });

  it("calculates occupancy and aggregate incidents", () => {
    const result = calculateKpis([
      { metric_code: "Tasks_Pct", expected: 1, actual: 0.8 },
      { metric_code: "Total_Beds", expected: null, actual: 10 },
      { metric_code: "Beds_Occ", expected: null, actual: 8 },
      { metric_code: "Inc_Total", expected: null, actual: 5 },
      { metric_code: "Inc_Reported_24h", expected: null, actual: 4 },
    ]);
    expect(result.occupancy).toBe(0.8);
    expect(result.incidents).toBe(5);
    expect(result.incidentsNotReported24h).toBe(1);
  });

  it("uses the highest positive risk severity", () => {
    expect(highestRisk([
      { metric_code: "Risk_Low", expected: null, actual: 3 },
      { metric_code: "Risk_High", expected: null, actual: 1 },
    ])).toBe("High");
  });

  it("marks only editable submissions overdue", () => {
    const now = new Date("2026-09-11T00:00:00Z");
    expect(isOverdue("draft", "2026-09-10T22:59:00Z", now)).toBe(true);
    expect(isOverdue("submitted", "2026-09-10T22:59:00Z", now)).toBe(false);
  });

  it("formats alert gaps cleanly without decimal floating-point artifacts", () => {
    expect(formatAlertGap(0.90909090909091, "fire drill task", "fire drill tasks")).toBe("91% fire drill tasks outstanding");
    expect(formatAlertGap(0.44999999999999996, "bedroom check", "bedroom checks")).toBe("45% bedroom checks outstanding");
    expect(formatAlertGap(2, "fire drill task", "fire drill tasks")).toBe("2 fire drill tasks outstanding");
    expect(formatAlertGap(1, "bedroom check", "bedroom checks")).toBe("1 bedroom check outstanding");
    expect(formatAlertGap(0, "task", "tasks")).toBeNull();
    expect(formatAlertGap(null, "task", "tasks")).toBeNull();
  });
});

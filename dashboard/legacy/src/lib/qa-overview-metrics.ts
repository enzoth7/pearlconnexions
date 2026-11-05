import { monthlyMeasures, type Measurement } from "@/lib/qa-capture";

export type OverviewReportBody = {
  occupied_beds?: string;
  measurements?: Record<string, Measurement>;
};

export type MeasureTotal = {
  code: string;
  label: string;
  unit: string;
  expected: number;
  completed: number;
  reportingHomes: number;
};

export const overviewAreas = [
  { label: "Records", codes: ["daily_records", "weekly_reports", "medication_checks"], color: "#087f82" },
  { label: "Staff", codes: ["supervisions"], color: "#2874ba" },
  { label: "People", codes: ["activities", "key_work"], color: "#8058bd" },
  { label: "Safety", codes: ["health_safety", "fire_logs", "fire_drills", "first_aid"], color: "#d36a21" },
] as const;

function validQuantity(value: string | undefined) {
  return value && /^\d{1,9}$/.test(value) ? Number(value) : null;
}

export function measureTotals(bodies: OverviewReportBody[]): MeasureTotal[] {
  return monthlyMeasures.map(measure => {
    const total: MeasureTotal = { code: measure.code, label: measure.label, unit: measure.unit, expected: 0, completed: 0, reportingHomes: 0 };
    for (const body of bodies) {
      const entry = body.measurements?.[measure.code];
      if (!entry || entry.na) continue;
      const expected = validQuantity(entry.expected);
      const completed = validQuantity(entry.completed);
      if (expected === null || completed === null || completed > expected || expected === 0) continue;
      total.expected += expected;
      total.completed += completed;
      total.reportingHomes += 1;
    }
    return total;
  });
}

export function totalsForCodes(totals: MeasureTotal[], codes: readonly string[]) {
  const matching = totals.filter(total => codes.includes(total.code));
  const expected = matching.reduce((sum, total) => sum + total.expected, 0);
  const completed = matching.reduce((sum, total) => sum + total.completed, 0);
  return { expected, completed, ratio: expected > 0 ? completed / expected : null };
}

export function averageOccupiedBeds(body: OverviewReportBody | undefined) {
  const value = body?.occupied_beds;
  return typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function reportedOccupiedBeds(bodies: OverviewReportBody[]) {
  const values = bodies.map(averageOccupiedBeds).filter((value): value is number => value !== null);
  return { total: values.reduce((sum, value) => sum + value, 0), homes: values.length };
}

export function overdueDate(value: unknown, today: string) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value < today;
}

import type { MetricValue } from "@/lib/types";

const RISK_ORDER = [
  ["Risk_Extremely_High", "Extremely high"],
  ["Risk_High", "High"],
  ["Risk_Moderate", "Moderate"],
  ["Risk_Low", "Low"],
] as const;

export function safeRatio(actual: number | null, expected: number | null) {
  if (actual === null || expected === null || expected <= 0) return null;
  return actual / expected;
}

export function weightedCompletion(values: MetricValue[], ratioCodes?: Set<string>) {
  let expected = 0;
  let actual = 0;
  for (const value of values) {
    if (ratioCodes && !ratioCodes.has(value.metric_code)) continue;
    if (value.expected === null || value.actual === null || value.expected <= 0) continue;
    expected += value.expected;
    actual += value.actual;
  }
  return expected > 0 ? actual / expected : null;
}

export function valueByCode(values: MetricValue[], code: string) {
  return values.find((value) => value.metric_code === code)?.actual ?? null;
}

export function calculateKpis(values: MetricValue[]) {
  const explicitCompletion = valueByCode(values, "Tasks_Pct");
  const beds = valueByCode(values, "Total_Beds");
  const occupied = valueByCode(values, "Beds_Occ");
  return {
    completion: explicitCompletion,
    occupancy: safeRatio(occupied, beds),
    occupiedBeds: occupied,
    incidents: valueByCode(values, "Inc_Total"),
    incidentsNotReported24h: difference(
      valueByCode(values, "Inc_Total"),
      valueByCode(values, "Inc_Reported_24h"),
    ),
    highestRisk: highestRisk(values),
  };
}

export function difference(expected: number | null, actual: number | null) {
  if (expected === null || actual === null) return null;
  return Math.max(0, expected - actual);
}

export function highestRisk(values: MetricValue[]) {
  for (const [code, label] of RISK_ORDER) {
    const count = valueByCode(values, code);
    if (count !== null && count > 0) return label;
  }
  return null;
}

export function formatPercent(value: number | null) {
  return value === null ? "Not collected" : new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number | null) {
  return value === null ? "Not collected" : new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function isOverdue(status: string, dueAt: string, now = new Date()) {
  return status === "draft" || status === "reopened"
    ? new Date(dueAt).getTime() < now.getTime()
    : false;
}

export function formatAlertGap(gap: number | null, singular: string, plural: string): string | null {
  if (gap === null || gap <= 0) return null;
  if (gap < 1) {
    const pct = Math.round(gap * 100);
    return `${pct}% ${plural} outstanding`;
  }
  const count = Math.round(gap);
  return `${count} ${count === 1 ? singular : plural} outstanding`;
}

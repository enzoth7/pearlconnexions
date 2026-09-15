import type { Period } from "@/lib/types";

export function formatPeriodLabel(
  period: Pick<Period, "label" | "month_start">,
  month: "long" | "short" = "long",
) {
  const customLabel = period.label?.trim();
  if (customLabel) return customLabel;

  return new Intl.DateTimeFormat("en-GB", {
    month,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period.month_start}T00:00:00Z`));
}

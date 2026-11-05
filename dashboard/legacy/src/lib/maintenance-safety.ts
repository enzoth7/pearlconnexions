export const safetyCheckTypes = ["Gas safety", "EICR", "PAT", "Fire alarm", "Emergency lighting", "Fire extinguishers", "Other"] as const;

export type SafetyCheck = {
  id: string;
  home_id: string;
  check_type: string;
  item_label: string;
  last_completed_on: string | null;
  next_due_on: string;
  certificate_reference: string;
  provider: string;
  notes: string;
  version: number;
};

export function safetyCheckState(check: Pick<SafetyCheck, "next_due_on">, today: string) {
  if (check.next_due_on < today) return "Overdue";
  const due = new Date(`${check.next_due_on}T12:00:00Z`);
  const current = new Date(`${today}T12:00:00Z`);
  return (due.getTime() - current.getTime()) / 86400000 <= 30 ? "Due soon" : "Current";
}

export function safetyCheckCounts(checks: SafetyCheck[], today: string) {
  return {
    overdue: checks.filter(check => safetyCheckState(check, today) === "Overdue").length,
    dueSoon: checks.filter(check => safetyCheckState(check, today) === "Due soon").length,
  };
}

export const maintenanceTargets: Record<string, number> = { Low: 30, Moderate: 7, High: 3, Urgent: 0 };

export function suggestedMaintenanceTarget(reportedOn: string, priority: string) {
  const days = maintenanceTargets[priority];
  if (days === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(reportedOn)) return "";
  const date = new Date(`${reportedOn}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

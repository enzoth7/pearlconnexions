import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function effectiveStatus(action: ActionRecord) {
  if (action.completed_at) return "Completed";
  const deadline = action.extended_deadline || action.deadline;
  if (deadline && new Date(`${deadline}T23:59:59Z`) < new Date()) return "Overdue";
  if (action.extended_deadline) return "Extended";
  return action.base_status;
}

export type DeadlineWindow =
  | ""
  | "this-week"
  | "next-week"
  | "this-month"
  | "next-month"
  | "no-deadline";

export const DEADLINE_WINDOW_LABELS: Record<DeadlineWindow, string> = {
  "": "All deadlines",
  "this-week": "Due this week",
  "next-week": "Due next week",
  "this-month": "Due this month",
  "next-month": "Due next month",
  "no-deadline": "No deadline",
};

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function matchesDeadlineWindow(
  action: Pick<ActionRecord, "deadline" | "extended_deadline">,
  window: DeadlineWindow,
  todayIso: string
) {
  if (!window) return true;
  const deadline = action.extended_deadline || action.deadline;
  if (window === "no-deadline") return !deadline;
  if (!deadline) return false;

  const today = new Date(`${todayIso}T00:00:00Z`);
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const thisMonday = addUtcDays(today, -mondayOffset);

  if (window === "this-week" || window === "next-week") {
    const start = window === "next-week" ? addUtcDays(thisMonday, 7) : thisMonday;
    const end = addUtcDays(start, 7);
    return deadline >= isoDate(start) && deadline < isoDate(end);
  }

  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const start = new Date(Date.UTC(year, window === "next-month" ? month + 1 : month, 1));
  const end = new Date(Date.UTC(year, window === "next-month" ? month + 2 : month + 1, 1));
  return deadline >= isoDate(start) && deadline < isoDate(end);
}

export function nextActionReference(
  workstreamName: string,
  workstreamReferences: string[],
  allReferences: string[]
) {
  const prefixCounts = new Map<string, number>();
  for (const reference of workstreamReferences) {
    const match = reference.toUpperCase().match(/^([A-Z]{2})\d{2}$/);
    if (match) prefixCounts.set(match[1], (prefixCounts.get(match[1]) ?? 0) + 1);
  }

  const existingPrefix = [...prefixCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0]?.[0];
  const words = workstreamName
    .replace(/[’']/g, "")
    .toUpperCase()
    .match(/[A-Z0-9]+/g)
    ?.filter((word) => !["AND", "THE", "OF"].includes(word)) ?? [];
  const fallbackPrefix =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`
      : (words[0] ?? "AC").slice(0, 2).padEnd(2, "X");
  const prefix = existingPrefix ?? fallbackPrefix;
  const usedNumbers = allReferences
    .map((reference) => reference.toUpperCase().match(new RegExp(`^${prefix}(\\d{2})$`)))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]));
  const nextNumber = Math.max(0, ...usedNumbers) + 1;

  if (nextNumber > 99) {
    throw new Error(`No automatic references remain for ${prefix}.`);
  }

  return `${prefix}${String(nextNumber).padStart(2, "0")}`;
}

export type Workstream = { id: string; name: string };
export const RESPONSIBILITY_TYPES = [
  "Owner",
  "Joint owner",
  "Collective SMT owner",
  "Support",
] as const;
export type ResponsibilityType = (typeof RESPONSIBILITY_TYPES)[number];

export type Manager = {
  id: string;
  name: string;
  role_title: string | null;
  email?: string | null;
  source_code?: string | null;
};
export type Participant = {
  id: string;
  responsibility_type: string;
  responsibility_text: string;
  manager: Manager;
};
export type UpdateRecord = {
  id: string;
  review_date: string;
  comments: string | null;
  barriers: string | null;
  next_review_at: string | null;
  outcome: string | null;
  evidence: string | null;
  lessons_learned: string | null;
  follow_up: string | null;
  directors_comments: string | null;
  created_at: string;
};
export type ActionRecord = {
  id: string;
  reference: string;
  title: string;
  workstream_id: string;
  workstream: Workstream | null;
  priority: string | null;
  base_status: string;
  date_added: string | null;
  deadline: string | null;
  extended_deadline: string | null;
  completed_at: string | null;
  participants: Participant[];
  updates?: UpdateRecord[];
  signoffs?: { id: string; signed_off_at: string; signed_off_by_name: string }[];
};

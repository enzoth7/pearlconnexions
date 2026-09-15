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

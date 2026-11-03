export type SubmissionStatus = "draft" | "submitted" | "approved" | "reopened";
export type DataClass = "demo" | "live";
export type MetricValueKind = "ratio" | "count" | "decimal" | "derived";
export type IncidentSeverity = "low" | "moderate" | "high" | "critical";
export type IncidentStatus = "closed" | "monitoring" | "follow_up";

export type Home = {
  id: string;
  code: string;
  name: string;
  provision: "Children's Home" | "Supported Living" | "Supported Accommodation";
  total_beds: number | null;
  active: boolean;
};

export type Period = {
  id: string;
  month_start: string;
  label: string | null;
  data_class: DataClass;
  opens_at: string;
  due_at: string;
  closed_at: string | null;
};

export type MetricDefinition = {
  code: string;
  display_name: string;
  category: string;
  source_scope: string;
  description: string;
  value_kind: MetricValueKind;
  requires_expected: boolean;
  active_for_house: boolean;
  display_order: number;
};

export type MetricValue = {
  id?: string;
  metric_code: string;
  expected: number | null;
  actual: number | null;
};

export type Submission = {
  id: string;
  home_id: string;
  period_id: string;
  status: SubmissionStatus;
  audit_date: string | null;
  version: number;
  is_late: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
};

export type IncidentDetail = {
  id: string;
  submission_id: string;
  incident_number: number;
  reference: string;
  occurred_at: string | null;
  incident_type: string | null;
  severity: IncidentSeverity | null;
  summary: string | null;
  details: string | null;
  action_taken: string | null;
  follow_up_notes: string | null;
  physical_intervention: boolean;
  reported_within_24h: boolean;
  status: IncidentStatus | null;
};

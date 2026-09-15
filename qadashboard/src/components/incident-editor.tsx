"use client";

import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INCIDENT_TYPES, summarizeIncidents } from "@/lib/incidents";
import type { IncidentDetail, IncidentSeverity, IncidentStatus } from "@/lib/types";
import { useState } from "react";

type EditableIncident = {
  key: string;
  occurredLocal: string;
  incidentType: string;
  severity: IncidentSeverity | "";
  summary: string;
  details: string;
  actionTaken: string;
  followUpNotes: string;
  physicalIntervention: boolean;
  reportedWithin24h: boolean;
  status: IncidentStatus | "";
};

function londonDateTime(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function fromStoredIncident(incident: IncidentDetail): EditableIncident {
  return {
    key: incident.id,
    occurredLocal: londonDateTime(incident.occurred_at),
    incidentType: incident.incident_type ?? "",
    severity: incident.severity ?? "",
    summary: incident.summary ?? "",
    details: incident.details ?? "",
    actionTaken: incident.action_taken ?? "",
    followUpNotes: incident.follow_up_notes ?? "",
    physicalIntervention: incident.physical_intervention,
    reportedWithin24h: incident.reported_within_24h,
    status: incident.status ?? "",
  };
}

function complete(incident: EditableIncident) {
  return Boolean(
    incident.occurredLocal &&
      incident.incidentType &&
      incident.severity &&
      incident.status &&
      incident.summary.trim().length >= 5 &&
      incident.details.trim().length >= 10 &&
      incident.actionTaken.trim().length >= 5 &&
      incident.followUpNotes.trim().length >= 5,
  );
}

export function IncidentEditor({
  initialIncidents,
  editable,
  onMetricsChange,
}: {
  initialIncidents: IncidentDetail[];
  editable: boolean;
  onMetricsChange: (summary: Record<string, number>) => void;
}) {
  const [incidents, setIncidents] = useState(() => initialIncidents.map(fromStoredIncident));

  function commit(next: EditableIncident[]) {
    setIncidents(next);
    onMetricsChange(
      summarizeIncidents(
        next.map((incident) => ({
          incident_type: incident.incidentType || null,
          physical_intervention: incident.physicalIntervention,
          reported_within_24h: incident.reportedWithin24h,
        })),
      ),
    );
  }

  function update(key: string, change: Partial<EditableIncident>) {
    commit(incidents.map((incident) => (incident.key === key ? { ...incident, ...change } : incident)));
  }

  function addIncident() {
    commit([
      ...incidents,
      {
        key: crypto.randomUUID(),
        occurredLocal: "",
        incidentType: "",
        severity: "",
        summary: "",
        details: "",
        actionTaken: "",
        followUpNotes: "",
        physicalIntervention: false,
        reportedWithin24h: true,
        status: "monitoring",
      },
    ]);
  }

  const serializable = incidents.map((incident, index) => ({
    incident_number: index + 1,
    occurred_local: incident.occurredLocal || null,
    incident_type: incident.incidentType || null,
    severity: incident.severity || null,
    summary: incident.summary.trim() || null,
    details: incident.details.trim() || null,
    action_taken: incident.actionTaken.trim() || null,
    follow_up_notes: incident.followUpNotes.trim() || null,
    physical_intervention: incident.physicalIntervention,
    reported_within_24h: incident.reportedWithin24h,
    status: incident.status || null,
  }));

  const completeCount = incidents.filter(complete).length;

  return (
    <div className="space-y-4">
      <input type="hidden" name="incident_entries" value={JSON.stringify(serializable)} />
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Incident records</h2>
          <p className="mt-1 text-sm text-slate-500">
            Record what happened, the immediate response and the management follow-up.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">
            {completeCount} of {incidents.length} complete
          </span>
          {editable ? (
            <Button type="button" onClick={addIncident} className="min-h-11 bg-blue-600 text-white hover:bg-blue-700">
              <Plus /> Add incident
            </Button>
          ) : null}
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto size-9 text-emerald-500" />
          <p className="mt-3 font-semibold text-slate-900">No incidents recorded</p>
          <p className="mt-1 text-sm text-slate-500">Add one only when an incident occurred in this reporting period.</p>
        </div>
      ) : null}

      {incidents.map((incident, index) => {
        const isComplete = complete(incident);
        return (
          <section key={incident.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 font-mono text-sm font-bold text-red-600">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">{incident.summary || `Incident ${index + 1}`}</h3>
                  <p className={`text-xs font-semibold ${isComplete ? "text-emerald-600" : "text-amber-600"}`}>
                    {isComplete ? "Ready to submit" : "Draft — details still required"}
                  </p>
                </div>
              </div>
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove incident ${index + 1}`}
                  onClick={() => commit(incidents.filter((item) => item.key !== incident.key))}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>

            <div className="grid gap-5 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Date and time" htmlFor={`${incident.key}-occurred`}>
                <Input
                  id={`${incident.key}-occurred`}
                  type="datetime-local"
                  value={incident.occurredLocal}
                  onChange={(event) => update(incident.key, { occurredLocal: event.target.value })}
                  disabled={!editable}
                />
              </Field>
              <Field label="Incident type" htmlFor={`${incident.key}-type`}>
                <select
                  id={`${incident.key}-type`}
                  value={incident.incidentType}
                  onChange={(event) => update(incident.key, { incidentType: event.target.value })}
                  disabled={!editable}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select type…</option>
                  {INCIDENT_TYPES.map((type) => <option key={type.label} value={type.label}>{type.label}</option>)}
                </select>
              </Field>
              <Field label="Severity" htmlFor={`${incident.key}-severity`}>
                <select
                  id={`${incident.key}-severity`}
                  value={incident.severity}
                  onChange={(event) => update(incident.key, { severity: event.target.value as IncidentSeverity | "" })}
                  disabled={!editable}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select severity…</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
              <Field label="Follow-up status" htmlFor={`${incident.key}-status`}>
                <select
                  id={`${incident.key}-status`}
                  value={incident.status}
                  onChange={(event) => update(incident.key, { status: event.target.value as IncidentStatus | "" })}
                  disabled={!editable}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select status…</option>
                  <option value="closed">Closed</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="follow_up">Follow-up required</option>
                </select>
              </Field>
            </div>

            <div className="space-y-5 border-t border-slate-100 p-4">
              <Field label="Short summary" htmlFor={`${incident.key}-summary`}>
                <Input
                  id={`${incident.key}-summary`}
                  value={incident.summary}
                  maxLength={240}
                  placeholder="Example: Young person returned safely after a missing episode"
                  onChange={(event) => update(incident.key, { summary: event.target.value })}
                  disabled={!editable}
                />
              </Field>
              <div className="grid gap-5 xl:grid-cols-3">
                <Field label="What happened?" htmlFor={`${incident.key}-details`}>
                  <Textarea
                    id={`${incident.key}-details`}
                    value={incident.details}
                    maxLength={2000}
                    rows={5}
                    placeholder="Describe the incident clearly and factually."
                    onChange={(event) => update(incident.key, { details: event.target.value })}
                    disabled={!editable}
                  />
                </Field>
                <Field label="Immediate action" htmlFor={`${incident.key}-action`}>
                  <Textarea
                    id={`${incident.key}-action`}
                    value={incident.actionTaken}
                    maxLength={2000}
                    rows={5}
                    placeholder="What did staff do immediately?"
                    onChange={(event) => update(incident.key, { actionTaken: event.target.value })}
                    disabled={!editable}
                  />
                </Field>
                <Field label="Management follow-up" htmlFor={`${incident.key}-follow-up`}>
                  <Textarea
                    id={`${incident.key}-follow-up`}
                    value={incident.followUpNotes}
                    maxLength={2000}
                    rows={5}
                    placeholder="Record review comments, actions and next steps."
                    onChange={(event) => update(incident.key, { followUpNotes: event.target.value })}
                    disabled={!editable}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-3 rounded-lg bg-slate-50 px-4 py-3 sm:flex-row sm:gap-8">
                <CheckField
                  label="Reported within 24 hours"
                  checked={incident.reportedWithin24h}
                  disabled={!editable}
                  onChange={(checked) => update(incident.key, { reportedWithin24h: checked })}
                />
                <CheckField
                  label="Physical intervention involved"
                  checked={incident.physicalIntervention}
                  disabled={!editable}
                  onChange={(checked) => update(incident.key, { physicalIntervention: checked })}
                />
              </div>
              {!isComplete ? (
                <p className="flex items-center gap-2 text-sm font-medium text-amber-700">
                  <AlertTriangle className="size-4" /> Complete every field before submitting the report. Drafts can be saved at any time.
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function CheckField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        className="size-5 rounded border-slate-300 accent-blue-600"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

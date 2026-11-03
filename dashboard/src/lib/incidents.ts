export const INCIDENT_TYPES = [
  { label: "Physical assault", metricCode: "Inc_Assault" },
  { label: "Absconding", metricCode: "Inc_Absconding" },
  { label: "Missing person", metricCode: "Inc_Missing" },
  { label: "Self-harm", metricCode: "Inc_SelfHarm" },
  { label: "Property damage", metricCode: "Inc_Damage" },
  { label: "Overdose", metricCode: "Inc_Overdose" },
  { label: "Verbal abuse", metricCode: "Inc_Verbal" },
] as const;

export type IncidentDraftSummary = {
  incident_type: string | null;
  physical_intervention: boolean;
  reported_within_24h: boolean;
};

export function summarizeIncidents(incidents: IncidentDraftSummary[]) {
  const summary: Record<string, number> = {
    Inc_Total: incidents.length,
    Inc_PI_Involved: 0,
    Inc_Reported_24h: 0,
  };

  for (const type of INCIDENT_TYPES) summary[type.metricCode] = 0;

  for (const incident of incidents) {
    if (incident.physical_intervention) summary.Inc_PI_Involved += 1;
    if (incident.reported_within_24h) summary.Inc_Reported_24h += 1;
    const type = INCIDENT_TYPES.find((entry) => entry.label === incident.incident_type);
    if (type) summary[type.metricCode] += 1;
  }

  return summary;
}

import { describe, expect, it } from "vitest";
import { summarizeIncidents } from "@/lib/incidents";

describe("summarizeIncidents", () => {
  it("derives the dashboard metrics from incident records", () => {
    expect(summarizeIncidents([
      { incident_type: "Physical assault", physical_intervention: true, reported_within_24h: true },
      { incident_type: "Verbal abuse", physical_intervention: false, reported_within_24h: true },
      { incident_type: "Physical assault", physical_intervention: false, reported_within_24h: false },
    ])).toMatchObject({
      Inc_Total: 3,
      Inc_Assault: 2,
      Inc_Verbal: 1,
      Inc_PI_Involved: 1,
      Inc_Reported_24h: 2,
      Inc_Missing: 0,
    });
  });

  it("keeps every incident metric at zero when the period has no incidents", () => {
    expect(summarizeIncidents([])).toEqual({
      Inc_Total: 0,
      Inc_PI_Involved: 0,
      Inc_Reported_24h: 0,
      Inc_Assault: 0,
      Inc_Absconding: 0,
      Inc_Missing: 0,
      Inc_SelfHarm: 0,
      Inc_Damage: 0,
      Inc_Overdose: 0,
      Inc_Verbal: 0,
    });
  });
});

import { describe, expect, it } from "vitest";
import { caseErrors, caseSchema, emptyCase, londonInstant, londonToday, measurementErrors, monthlyMeasures, qaRating, reportedWithin24h } from "../legacy/src/lib/qa-capture";
const home = "00000000-0000-4000-8000-000000000001";
describe("London incident timing", () => {
  it("respects summer time and the local date near midnight", () => {
    expect(londonInstant("2026-07-01T00:30")).toBe("2026-06-30T23:30:00.000Z");
    expect(londonToday(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
  });
  it("rejects nonexistent times and requires disambiguation for repeated times", () => {
    expect(londonInstant("2026-03-29T01:30")).toBeNull();
    expect(londonInstant("2026-10-25T01:30")).toBeNull();
    expect(londonInstant("2026-10-25T01:30", "60")).toBe("2026-10-25T00:30:00.000Z");
    expect(londonInstant("2026-10-25T01:30", "0")).toBe("2026-10-25T01:30:00.000Z");
  });
  it("never treats unknown notifications as on time", () => {
    expect(reportedWithin24h({ notification: "pending", occurred_at: "2026-11-03T10:00:00Z", notified_at: "" })).toBeNull();
    expect(reportedWithin24h({ notification: "done", occurred_at: "2026-11-03T10:00:00Z", notified_at: "2026-11-04T10:00:00Z" })).toBe(true);
    expect(reportedWithin24h({ notification: "done", occurred_at: "2026-11-03T10:00:00Z", notified_at: "2026-11-04T10:01:00Z" })).toBe(false);
    expect(reportedWithin24h({ notification: "done", occurred_at: "2026-11-03T10:00:00Z", notified_at: "2026-11-02T10:00:00Z" })).toBeNull();
  });
});
describe("QA classification", () => {
  it.each([[0,"Inadequate"],[.5,"Inadequate"],[.5001,"Requires improvement"],[.75,"Requires improvement"],[.7501,"Good"],[.9,"Good"],[.9001,"Outstanding"],[1,"Outstanding"]])("classifies boundary %s", (n, label) => expect(qaRating(Number(n)).label).toBe(label));
  it("uses displayed precision and neutral missing data", () => { expect(qaRating(.500049).label).toBe("Inadequate"); expect(qaRating(null).value).toBeNull(); expect(qaRating(NaN).value).toBeNull(); });
});
describe("publish validation", () => {
  it("accepts database UUIDs used by linked individual risks", () => {
    const incident = emptyCase("incidents", home);
    incident.data.person_ids = ["5f915a4d-0b5f-ee99-6d10-557f5e2eb6a9"];
    incident.data.linked_risk_ids = ["e1e02b6f-b23f-d919-aab4-439bd19f3f1c"];
    expect(caseSchema.safeParse(incident).success).toBe(true);
  });
  it("allows incomplete drafts but requires a person name on registration", () => { const r = emptyCase("risks",home); expect(caseErrors(r)).toEqual({}); expect(caseErrors({ ...r,is_draft:false })).toHaveProperty("person_name"); r.data.person_name="Example person"; expect(caseErrors({ ...r,is_draft:false })).not.toHaveProperty("person_name"); expect(caseErrors({ ...r,is_draft:false })).not.toHaveProperty("location"); });
  it("requires actual start and closure fields for maintenance", () => { const r=emptyCase("maintenance",home); r.is_draft=false;r.status="In progress";expect(caseErrors(r)).toHaveProperty("started_on");r.status="Completed";expect(caseErrors(r)).toHaveProperty("closed_on");expect(caseErrors(r)).toHaveProperty("resolution"); });
  it("separates missing measurements, true zero, and not applicable", () => {
    const quantities=Object.fromEntries(monthlyMeasures.map(m=>[m.code,{expected:"0",completed:"0",na:false,note:"No obligations scheduled"}]));
    expect(measurementErrors(quantities)).toEqual({});
    quantities.daily_records={expected:"",completed:"",na:false,note:""};expect(measurementErrors(quantities)).toHaveProperty("daily_records");
    quantities.daily_records={expected:"",completed:"",na:true,note:"Not provided by this service"};expect(measurementErrors(quantities)).toEqual({});
    quantities.daily_records={expected:"5",completed:"6",na:false,note:""};expect(measurementErrors(quantities)).toHaveProperty("daily_records");
  });
});

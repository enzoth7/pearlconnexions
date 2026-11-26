import { describe, expect, it } from "vitest";
import { effectiveStatus, isActionClosed, normalizeSignoffs, signedOffLate, type ActionRecord } from "@/workbook/lib/utils";

const action = (value: Partial<ActionRecord>): ActionRecord => ({
  id: "1", reference: "AA01", title: "Action", workstream_id: "1", workstream: null, priority: null,
  base_status: "Not Started", date_added: null, deadline: null, extended_deadline: null, completed_at: null,
  participants: [], ...value,
});

describe("recurring compliance tasks", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const later = new Date("2026-11-26T12:00:00Z");
  const monthly = (value: Partial<ActionRecord>) => action({ recurrence: "monthly", recurrence_day: 25, period_month: "2026-11-01", deadline: "2026-11-25", ...value });
  const signed = [{ id: "s", signed_off_at: "2026-11-24T10:00:00Z", signed_off_by_name: "Joel Samuel" }];

  it("needs a sign-off to count as completed", () => {
    expect(effectiveStatus(monthly({ completed_at: "2026-11-20" }), now)).toBe("Awaiting sign-off");
    expect(effectiveStatus(monthly({ completed_at: "2026-11-20", signoffs: signed }), now)).toBe("Completed");
  });

  it("is overdue after the deadline when not signed off, even if marked completed", () => {
    expect(effectiveStatus(monthly({ completed_at: "2026-11-20" }), later)).toBe("Overdue");
    expect(effectiveStatus(monthly({}), later)).toBe("Overdue");
    expect(effectiveStatus(monthly({ completed_at: "2026-11-20", signoffs: signed }), later)).toBe("Completed");
  });

  it("keeps one-off actions complete on their completion date", () => {
    expect(effectiveStatus(action({ completed_at: "2026-11-20", deadline: "2026-11-01" }), later)).toBe("Completed");
  });

  it("stays in the live workbook until signed off and flags late sign-offs", () => {
    expect(isActionClosed(monthly({ completed_at: "2026-11-20" }))).toBe(false);
    expect(isActionClosed(monthly({ completed_at: "2026-11-20", signoffs: signed }))).toBe(true);
    expect(isActionClosed(action({ completed_at: "2026-11-20" }))).toBe(true);
    expect(signedOffLate(monthly({ signoffs: [{ ...signed[0], signed_off_at: "2026-11-27T09:00:00Z" }] }))).toBe(true);
    expect(signedOffLate(monthly({ signoffs: signed }))).toBe(false);
  });

  it("accepts the sign-off as the single object the API returns", () => {
    const fromApi = { ...monthly({ completed_at: "2026-11-20" }), signoffs: signed[0] } as unknown as ActionRecord;
    expect(normalizeSignoffs(fromApi).signoffs).toHaveLength(1);
    expect(effectiveStatus(fromApi, later)).toBe("Completed");
    expect(normalizeSignoffs({ signoffs: null }).signoffs).toEqual([]);
  });
});

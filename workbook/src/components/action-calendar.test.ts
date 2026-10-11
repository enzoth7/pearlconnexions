import { describe, expect, it } from "vitest";
import { isOwnedByManager, makeCalendarEvents } from "./action-calendar";
import type { ActionRecord } from "@/lib/utils";

describe("makeCalendarEvents", () => {
  it("normalizes single-object Supabase relations", () => {
    const action = {
      id: "action-1",
      reference: "BD01",
      title: "Prepare the service review",
      workstream_id: "workstream-1",
      workstream: null,
      priority: "Medium",
      base_status: "In Progress",
      date_added: "2026-10-01",
      deadline: "2026-10-20",
      extended_deadline: null,
      completed_at: null,
      participants: {
        id: "participant-1",
        responsibility_type: "Owner",
        responsibility_text: "Lead",
        manager: { id: "manager-1", name: "Mike Wright", role_title: null },
      },
      signoffs: {
        id: "signoff-1",
        signed_off_at: "2026-10-22",
        signed_off_by_name: "Joel Samuel",
      },
      updates: {
        id: "update-1",
        review_date: "2026-10-11",
        next_review_at: "2026-10-18",
        comments: null,
        barriers: null,
        outcome: null,
        evidence: null,
        lessons_learned: null,
        follow_up: null,
        directors_comments: null,
        created_at: "2026-10-11",
      },
    } as unknown as ActionRecord;

    const events = makeCalendarEvents([action]);

    expect(events.map((event) => [event.kind, event.date])).toEqual([
      ["review", "2026-10-11"],
      ["next-review", "2026-10-18"],
      ["deadline", "2026-10-20"],
      ["completed", "2026-10-22"],
    ]);
    expect(events[0]).toMatchObject({
      managerCodes: "MW",
      manager: "Mike Wright",
      priority: "Medium",
    });
  });

  it("filters managers by ownership and excludes support assignments", () => {
    const action = {
      participants: [
        {
          responsibility_type: "Owner",
          manager: { id: "owner-1", name: "Owner Manager" },
        },
        {
          responsibility_type: "Support",
          manager: { id: "support-1", name: "Support Manager" },
        },
      ],
    } as unknown as ActionRecord;

    expect(isOwnedByManager(action, "owner-1")).toBe(true);
    expect(isOwnedByManager(action, "support-1")).toBe(false);
  });
});

import { expect, it } from "vitest";
import { caseErrors, emptyCase } from "../legacy/src/lib/qa-capture";
import { safetyCheckState, suggestedMaintenanceTarget } from "../legacy/src/lib/maintenance-safety";

it("distinguishes overdue, due today, the 30-day boundary and current checks", () => {
  const today = "2026-11-04";
  expect(safetyCheckState({ next_due_on: "2026-11-03" }, today)).toBe("Overdue");
  expect(safetyCheckState({ next_due_on: today }, today)).toBe("Due soon");
  expect(safetyCheckState({ next_due_on: "2026-12-04" }, today)).toBe("Due soon");
  expect(safetyCheckState({ next_due_on: "2026-12-05" }, today)).toBe("Current");
});

it("suggests editable issue targets and requires a safety action for urgent registration", () => {
  expect(suggestedMaintenanceTarget("2026-11-04", "Urgent")).toBe("2026-11-04");
  expect(suggestedMaintenanceTarget("2026-11-04", "High")).toBe("2026-11-07");
  expect(suggestedMaintenanceTarget("2026-11-04", "Moderate")).toBe("2026-11-11");
  expect(suggestedMaintenanceTarget("2026-11-04", "Low")).toBe("2026-12-04");
  const issue = emptyCase("maintenance", "00000000-0000-4000-8000-000000000101");
  issue.is_draft = false;
  issue.title = "Unsafe electrical installation";
  issue.data = { ...issue.data, category: "Electrical", description: "Live wire exposed", location: "Kitchen", priority: "Urgent" };
  expect(caseErrors(issue).critical_action).toMatch(/immediate action/i);
  issue.data.critical_action = "Isolated power and closed the room.";
  expect(caseErrors(issue).critical_action).toBeUndefined();
});

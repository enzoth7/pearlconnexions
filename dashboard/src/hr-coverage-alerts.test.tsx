// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HrCoverageAlerts } from "../legacy/src/components/hr-coverage-alerts";

vi.mock("./shims/supabase", () => ({
  supabase: { from: () => ({ select: async () => ({ error: null, data: [{
    shift_on: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
    shift_type: "Waking night", required_staff: 2, planned_staff: 2, present_staff: 0,
    commissioned_support_hours: 8, delivered_support_hours: 5,
    commissioned_one_to_one_hours: null, delivered_one_to_one_hours: null,
    commissioned_two_to_one_hours: 4, delivered_two_to_one_hours: 4,
  }] }) }) },
}));

afterEach(cleanup);

it("shows uncovered waking nights, unmet hours and unknown 1:1 amounts separately", async () => {
  render(<HrCoverageAlerts />);
  await waitFor(() => expect(screen.getByText("Uncovered waking nights")).toBeTruthy());
  expect(screen.getByText("3 h")).toBeTruthy();
  expect(screen.getByText("Pending")).toBeTruthy();
  expect(screen.getByText("0 h")).toBeTruthy();
  expect(screen.getAllByText("1")).toHaveLength(2);
});

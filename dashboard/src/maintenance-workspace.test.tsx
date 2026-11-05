// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MaintenanceIssues, MaintenanceOverview } from "../legacy/src/components/maintenance-workspace";
import { openedByMonth } from "../legacy/src/components/maintenance-timeline";
import { caseDataSchema, type CaseRecord } from "../legacy/src/lib/qa-capture";

vi.mock("../legacy/src/lib/qa-cases-client", () => ({ saveCase: vi.fn() }));
afterEach(cleanup);
const homes = [
  { id: "00000000-0000-4000-8000-000000000101", code: "CH1", name: "Home A", address: null, provision: "Supported Living" as const, total_beds: null, active: true },
  { id: "00000000-0000-4000-8000-000000000102", code: "CH2", name: "Home B", address: null, provision: "Supported Living" as const, total_beds: null, active: true },
];
const records: CaseRecord[] = [
  { id: "00000000-0000-4000-8000-000000000301", version: 1, schema_version: 2, kind: "maintenance", home_id: homes[0].id, occurred_on: "2026-11-03", title: "Window repair", status: "In progress", is_draft: false, data: caseDataSchema.parse({ category: "Doors / windows", priority: "High", due_on: "2026-11-01", location: "Lounge", description: "Handle broken" }), actions: [], reviews: [] },
  { id: "00000000-0000-4000-8000-000000000302", version: 1, schema_version: 2, kind: "maintenance", home_id: homes[1].id, occurred_on: "2026-11-02", title: "Boiler check", status: "Completed", is_draft: false, data: caseDataSchema.parse({ category: "Heating / plumbing", priority: "Low", closed_on: "2026-11-03", location: "Kitchen" }), actions: [], reviews: [] },
];

it("moves completed issues to Historical and keeps its header filters and detail dialog", () => {
  const active = render(<MaintenanceIssues homes={homes} records={records} canManageMaintenance />);
  expect(within(screen.getByRole("table")).queryByText("Boiler check")).toBeNull();
  active.unmount();
  render(<MaintenanceIssues homes={homes} records={records} canManageMaintenance historical />);
  const table = screen.getByRole("table");
  expect(screen.getByRole("heading", { name: "Historical" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add issue" })).toBeNull();
  expect(within(table).queryByText("Window repair")).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Filter Home" }), { key: "Enter" });
  expect(screen.queryByRole("combobox", { name: "Filter by home" })).toBeNull();
  fireEvent.click(screen.getByRole("menuitemradio", { name: "Home B" }));
  expect(within(table).getByText("Boiler check")).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Change status for Boiler check" }).className).toContain("bg-emerald-100");
  fireEvent.click(screen.getByRole("button", { name: "View completed Boiler check" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByLabelText("Category")).toBeTruthy();
  expect(screen.queryByText("Follow-up actions")).toBeNull();
  expect(screen.queryByText("Follow-up notes")).toBeNull();
  expect(screen.queryByText("Add action")).toBeNull();
  expect(screen.queryByText("Maintenance / Issues")).toBeNull();
  expect(screen.queryByText(/of 2 issues/)).toBeNull();
});

it("opens the wide issue form when a status change needs completion details", () => {
  render(<MaintenanceIssues homes={homes} records={records} canManageMaintenance />);
  expect(within(screen.getByRole("table")).getByText("High", { selector: "strong" }).className).toContain("bg-orange-100");
  const status = screen.getByRole("combobox", { name: "Change status for Window repair" });
  expect(status.className).toContain("bg-sky-100");
  fireEvent.keyDown(status, { key: "ArrowDown" });
  fireEvent.click(screen.getByRole("option", { name: "Completed" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByLabelText("Completion date")).toBeTruthy();
  expect(screen.getByLabelText("Resolution")).toBeTruthy();
});

it("offers expanded locations and a custom location in the styled menu", () => {
  render(<MaintenanceIssues homes={homes} records={records} canManageMaintenance />);
  fireEvent.click(screen.getByRole("button", { name: "Add issue" }));
  const location = screen.getByRole("combobox", { name: "Location" });
  expect(location.tagName).toBe("BUTTON");
  fireEvent.keyDown(location, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: "Boiler / plant room" })).toBeTruthy();
  fireEvent.click(screen.getByRole("option", { name: "Other location…" }));
  const custom = screen.getByRole("textbox", { name: "Specify location" }) as HTMLInputElement;
  fireEvent.change(custom, { target: { value: "Workshop" } });
  expect(custom.value).toBe("Workshop");
});

it("summarises only registered maintenance records by home", () => {
  render(<MaintenanceOverview homes={homes} records={records} />);
  expect(within(screen.getByRole("region", { name: "Maintenance totals" })).getAllByText("1", { selector: "strong" })).toHaveLength(4);
  expect(screen.getByText("By area")).toBeTruthy();
  expect(screen.getByText("Lounge")).toBeTruthy();
  expect(screen.queryByText("Needs attention")).toBeNull();
  expect(openedByMonth(records, "2026-11-04").at(-1)?.opened).toBe(2);
});

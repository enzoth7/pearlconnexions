// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspaceNavigation } from "./shims/workspace-navigation";
import { matchRoute } from "./routes";

afterEach(cleanup);

it("shows Overview, Issues, Checks and Historical in Maintenance navigation and opens overview", async () => {
  window.scrollTo = vi.fn();
  history.replaceState(null, "", "/maintenance");
  render(<WorkspaceNavigation name="Manager" qaRole="house_lead" workbookRole={null} finance={false} hr={false} isAdmin={false} maintenance sections={["maintenance.overview", "maintenance.issues", "maintenance.checks", "maintenance.historical"]}>Content</WorkspaceNavigation>);
  const navigation = screen.getByRole("navigation", { name: "Maintenance sections" });
  const overview = within(navigation).getByRole("link", { name: "Overview" });
  expect(within(navigation).getByRole("link", { name: "Issues" })).toBeTruthy();
  expect(within(navigation).getByRole("link", { name: "Checks" }).getAttribute("href")).toBe("/maintenance/checks");
  expect(matchRoute("/maintenance/checks")?.route.section).toBe("maintenance.checks");
  expect(within(navigation).getByRole("link", { name: "Historical" }).getAttribute("href")).toBe("/maintenance/historical");
  expect(matchRoute("/maintenance/historical")?.route.section).toBe("maintenance.historical");
  expect(overview.getAttribute("href")).toBe("/maintenance/overview");
  expect(matchRoute("/maintenance/overview")?.route.section).toBe("maintenance.overview");
  fireEvent.click(overview);
  await waitFor(() => expect(location.pathname).toBe("/maintenance/overview"));
  expect(screen.getByRole("combobox", { name: "Section" }).querySelector('option[value="/maintenance/overview"]')).toBeTruthy();
});

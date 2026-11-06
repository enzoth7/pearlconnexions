// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspacePermissionsForm } from "../legacy/src/components/workspace-permissions-form";
import { savePermissionChange } from "@/lib/permission-save";
import type { WorkspaceUser } from "@/lib/workspace-users";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/permission-save", () => ({ savePermissionChange: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const user: WorkspaceUser = {
  id: "manager-user", name: "Example manager", email: "manager@example.com", role: "Manager",
  managerId: "manager", qaMemberId: null, qaMemberActive: false, qaAssignedHomeIds: [], hasQaMembership: false,
  canUseWorkbook: true, qa: false, workbook: false, finance: false, hr: false, isAdmin: false, sections: [],
};

it("offers each navigation tab and saves only the selected section", async () => {
  vi.mocked(savePermissionChange).mockResolvedValue({ ok: true, message: "Section access saved." });
  render(<WorkspacePermissionsForm user={user} />);
  for (const label of [
    "Quality & Governance: Follow-up", "Quality & Governance: Recurrences",
    "Workbook: Overview", "Workbook: Calendar", "Workbook: Action register",
    "Workbook: Action review", "Workbook: Completed actions",
    "Finance: Expenses", "Finance: Payroll", "Finance: Invoices",
    "HR: Employees", "HR: Coverage", "HR: Recruitment",
    "Maintenance: Overview", "Maintenance: Issues", "Maintenance: Checks", "Maintenance: Historical",
  ]) expect((screen.getByRole("checkbox", { name: label }) as HTMLInputElement).disabled).toBe(false);

  fireEvent.click(screen.getByRole("checkbox", { name: "Finance: Payroll" }));
  fireEvent.click(screen.getByRole("button", { name: "Save section access" }));
  await waitFor(() => expect(savePermissionChange).toHaveBeenCalledOnce());
  const data = vi.mocked(savePermissionChange).mock.calls[0][1];
  expect(data.getAll("sections")).toEqual(["finance.payroll"]);
  expect(data.has("workbook")).toBe(false);
});

it("shows legacy workbook access as all five workbook tabs", () => {
  render(<WorkspacePermissionsForm user={{ ...user, workbook: true }} />);
  for (const label of ["Overview", "Calendar", "Action register", "Action review", "Completed actions"]) {
    expect((screen.getByRole("checkbox", { name: `Workbook: ${label}` }) as HTMLInputElement).checked).toBe(true);
  }
  expect((screen.getByRole("checkbox", { name: "Quality & Governance: Overview" }) as HTMLInputElement).checked).toBe(false);
});

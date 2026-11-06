import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspacePermissionsForm } from "./workspace-permissions-form";
import { permissionSaveUnconfirmed, savePermissionChange } from "@/lib/permission-save";
import type { WorkspaceUser } from "@/lib/workspace-users";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/permission-save", async original => ({
  ...await original<typeof import("@/lib/permission-save")>(), savePermissionChange: vi.fn(),
}));

const user: WorkspaceUser = {
  id: "manager-user", name: "Example manager", email: "manager@example.com", role: "Manager",
  managerId: "manager", qaMemberId: null, qaMemberActive: false, qaAssignedHomeIds: [], hasQaMembership: false,
  canUseWorkbook: true, qa: false, workbook: true, finance: false, hr: false, isAdmin: false,
};

describe("panel access editor", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("keeps the selection and permits a retry after an unconfirmed response", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: false, message: permissionSaveUnconfirmed });
    render(<WorkspacePermissionsForm user={user} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Workbook" }));
    fireEvent.click(screen.getByRole("button", { name: "Save section access" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The server could not confirm");
    expect(screen.getByRole("checkbox", { name: "Workbook" })).not.toBeChecked();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save section access" })).toBeEnabled());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("submits checked permissions and refreshes only after success", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: true, message: "Permissions saved." });
    render(<WorkspacePermissionsForm user={user} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Finance" }));
    fireEvent.click(screen.getByRole("button", { name: "Save section access" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Permissions saved.");
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    const [kind, data] = vi.mocked(savePermissionChange).mock.calls[0];
    expect(kind).toBe("panels");
    expect(data.get("user_id")).toBe(user.id);
    expect(data.get("workbook")).toBe("on");
    expect(data.getAll("sections")).toContain("finance.overview");
    expect(data.get("sections_version")).toBe("1");
    expect(data.getAll("sections")).not.toContain("hr.overview");
  });

  it("shows Workbook action permissions directly beneath Workbook", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: true });
    render(<WorkspacePermissionsForm user={user} actor={{ role: "director", userId: "director-user" } as never}
      manager={{ id: "manager", profile: { role: "manager" }, can_add_actions: false } as never} permissionsReady />);
    const workbook = screen.getByRole("region", { name: "Workbook" });
    expect(within(workbook).getByRole("checkbox", { name: "Workbook" })).toBeInTheDocument();
    expect(within(workbook).getByRole("checkbox", { name: "Add actions" })).toBeInTheDocument();
    expect(within(workbook).getByRole("checkbox", { name: "Sign off actions" })).toBeInTheDocument();
    expect(screen.queryByText("Workbook action permissions appear below for directors.")).not.toBeInTheDocument();
    fireEvent.click(within(workbook).getByRole("checkbox", { name: "Add actions" }));
    await waitFor(() => expect(savePermissionChange).toHaveBeenCalledOnce());
    const [kind, data] = vi.mocked(savePermissionChange).mock.calls[0];
    expect(kind).toBe("workbook");
    expect(data.get("permission")).toBe("can_add_actions");
  });

  it("shows employee and login access inside the Settings section", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: true });
    render(<WorkspacePermissionsForm user={{ ...user, sections: ["settings.users_permissions"] }} actor={{ role: "director", userId: "director-user" } as never}
      manager={{ id: "manager", profile: { role: "manager" }, can_manage_employees: false, can_manage_logins: true } as never} permissionsReady />);
    const settings = screen.getByRole("region", { name: "Settings" });
    expect(within(settings).getByText("1/3")).toBeInTheDocument();
    expect(within(settings).getByRole("checkbox", { name: "Settings: Users & permissions" })).toBeChecked();
    expect(within(settings).getByRole("checkbox", { name: "Settings: Houses" })).not.toBeChecked();
    expect(within(settings).getByRole("checkbox", { name: "Settings: Activity log" })).not.toBeChecked();
    expect(within(settings).getByRole("checkbox", { name: "Add and manage employees" })).not.toBeChecked();
    expect(within(settings).getByRole("checkbox", { name: "Manage employee logins" })).toBeChecked();
    expect(screen.queryByRole("heading", { name: "Settings access" })).not.toBeInTheDocument();
    fireEvent.click(within(settings).getByRole("checkbox", { name: "Add and manage employees" }));
    await waitFor(() => expect(savePermissionChange).toHaveBeenCalledOnce());
    const [kind, data] = vi.mocked(savePermissionChange).mock.calls[0];
    expect(kind).toBe("workbook");
    expect(data.get("permission")).toBe("can_manage_employees");
  });

  it("lets Joel grant Activity log separately from the other Settings tabs and actions", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: true });
    render(<WorkspacePermissionsForm user={{ ...user, sections: ["settings.users_permissions"] }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Settings: Activity log" }));
    fireEvent.click(screen.getByRole("button", { name: "Save section access" }));
    await waitFor(() => expect(savePermissionChange).toHaveBeenCalledOnce());
    const [kind, data] = vi.mocked(savePermissionChange).mock.calls[0];
    expect(kind).toBe("panels");
    expect(data.getAll("sections")).toContain("settings.activity_log");
    expect(data.getAll("sections")).toContain("settings.users_permissions");
    expect(data.getAll("sections")).not.toContain("settings.houses");
  });

  it("preserves the administrator's locked access", () => {
    render(<WorkspacePermissionsForm user={{ ...user, isAdmin: true, qa: true, finance: true, hr: true }} />);
    expect(screen.queryByRole("button", { name: "Save section access" })).not.toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).toBeDisabled();
  });
  it("selects one QA subtab and shows a partial parent selection", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: true, message: "Section access saved." });
    render(<WorkspacePermissionsForm user={{ ...user, sections: [] }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Quality & Governance: Reports" }));
    expect(screen.getByRole("checkbox", { name: "Quality & Governance" })).toBePartiallyChecked();
    expect(screen.getByRole("checkbox", { name: "Quality & Governance: Incidents" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save section access" }));
    await screen.findByRole("status");
    const sections = vi.mocked(savePermissionChange).mock.calls[0][1].getAll("sections");
    expect(sections.filter(section => String(section).startsWith("qa."))).toEqual(["qa.monthly_reports"]);
    expect(sections).toContain("workbook.overview");
  });
  it("toggles every QA section, including Reviews", () => {
    render(<WorkspacePermissionsForm user={{ ...user, sections: [] }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Quality & Governance" }));
    expect(screen.getByRole("checkbox", { name: "Quality & Governance: Reports" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Quality & Governance: Incidents" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Quality & Governance: Reviews" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Quality & Governance: Reviews" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Quality & Governance" }));
    expect(screen.getByRole("checkbox", { name: "Quality & Governance: Reports" })).not.toBeChecked();
  });
  it("lets an authorised manager grant only sections they can open", async () => {
    vi.mocked(savePermissionChange).mockResolvedValue({ ok: true });
    const actor = { userId: "parent", role: "pending", managerId: "parent-manager", canManageEmployees: true,
      workbookRole: "manager", sections: ["qa.monthly_reports", "team.organisation_chart"] } as const;
    render(<WorkspacePermissionsForm user={{ ...user, sections: [] }} actor={actor as never} />);
    expect(screen.getByRole("checkbox", { name: "Team: Organisation chart" })).toBeEnabled();
    expect(screen.queryByRole("checkbox", { name: "Quality & Governance: Incidents" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Team: Organisation chart" }));
    fireEvent.click(screen.getByRole("button", { name: "Save section access" }));
    await waitFor(() => expect(savePermissionChange).toHaveBeenCalledOnce());
    expect(vi.mocked(savePermissionChange).mock.calls[0][1].getAll("sections")).toEqual(["team.organisation_chart"]);
  });
});

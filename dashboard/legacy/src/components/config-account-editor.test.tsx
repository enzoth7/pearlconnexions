import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigAccountEditor } from "./config-account-editor";
import { saveAccountChange } from "@/lib/account-save";
import type { ConfigPerson } from "@/lib/config-directory";

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock("@/workbook/actions", () => ({ createManager: vi.fn() }));
vi.mock("@/lib/account-save", async original => ({
  ...await original<typeof import("@/lib/account-save")>(), saveAccountChange: vi.fn(),
}));
vi.mock("@/components/user-management", () => ({ InviteMemberForm: () => null }));

const person: ConfigPerson = {
  key: "manager:example",
  name: "Example Manager",
  email: "manager@example.com",
  role: "Manager",
  user: null,
  manager: {
    id: "example-manager",
    name: "Example Manager",
    email: "manager@example.com",
    role_title: "House manager",
    parent_manager_id: null,
    profile_id: "example-user",
    profile: { id: "example-user", display_name: "Example Manager", role: "manager" },
  },
};

function renderManager() {
  render(<ConfigAccountEditor person={person} managers={[person.manager!]} homes={[]}
    currentUserId="director-user" teamHierarchyReady />);
}

describe("account save responses", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows only direct employee fields to a manager without login management", () => {
    render(<ConfigAccountEditor person={null} managers={[person.manager!]} homes={[]}
      currentUserId="manager-user" teamHierarchyReady actor={{ userId: "manager-user", role: "pending", managerId: "parent", canManageEmployees: true, canManageLogins: false } as never} />);
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reports to")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "House Lead" })).not.toBeInTheDocument();
  });

  it("keeps edits and reports a rejected server response inside the form", async () => {
    vi.mocked(saveAccountChange).mockRejectedValue(new Error("An unexpected response was received from the server."));
    renderManager();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Edited Manager" } });
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The server could not confirm this change.");
    expect(screen.getByLabelText("Full name")).toHaveValue("Edited Manager");
    await waitFor(() => expect(screen.getByRole("button", { name: "Save user" })).toBeEnabled());
    expect(refresh).not.toHaveBeenCalled();
    expect(saveAccountChange).toHaveBeenCalledOnce();
  });

  it("refreshes after a confirmed save", async () => {
    vi.mocked(saveAccountChange).mockResolvedValue({ ok: true });
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("User saved.");
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("displays an authorization error without reporting success", async () => {
    vi.mocked(saveAccountChange).mockResolvedValue({ ok: false, message: "You do not have permission to manage this employee." });
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("You do not have permission");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("also handles rejected responses for House Lead accounts", async () => {
    vi.mocked(saveAccountChange).mockRejectedValue(new Error("Connection closed"));
    const houseLead = { ...person, key: "user:example", manager: null,
      user: { qaMemberId: "example-member", qaMemberActive: true } } as ConfigPerson;
    render(<ConfigAccountEditor person={houseLead} managers={[]} homes={[]}
      currentUserId="director-user" teamHierarchyReady />);
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The server could not confirm this change.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sends a name change without unchanged login, role or reporting details", async () => {
    vi.mocked(saveAccountChange).mockResolvedValue({ ok: true });
    renderManager();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Changed name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    await screen.findByRole("status");
    const [kind, data] = vi.mocked(saveAccountChange).mock.calls[0];
    expect(kind).toBe("manager");
    expect(data.get("manager_id")).toBe(person.manager!.id);
    expect(data.get("name")).toBe("Changed name");
    for (const field of ["email", "password", "confirm_password", "role_title", "parent_manager_id", "system_role"]) {
      expect(data.has(field)).toBe(false);
    }
  });

  it("includes an email edit when it is intentionally changed", async () => {
    vi.mocked(saveAccountChange).mockResolvedValue({ ok: true });
    renderManager();
    fireEvent.change(screen.getByLabelText("Login email"), { target: { value: "changed@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    await screen.findByRole("status");
    expect(vi.mocked(saveAccountChange).mock.calls[0][1].get("email")).toBe("changed@example.com");
  });
});

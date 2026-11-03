import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigAccountEditor } from "./config-account-editor";
import { updateManagerCredentials } from "@/workbook/actions";
import { saveQaAccount } from "@/app/actions";
import type { ConfigPerson } from "@/lib/config-directory";

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock("@/workbook/actions", () => ({ updateManagerCredentials: vi.fn(), createManager: vi.fn() }));
vi.mock("@/app/actions", () => ({ saveQaAccount: vi.fn() }));
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

  it("keeps edits and reports a rejected server response inside the form", async () => {
    vi.mocked(updateManagerCredentials).mockRejectedValue(new Error("An unexpected response was received from the server."));
    renderManager();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Edited Manager" } });
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The server could not confirm this change.");
    expect(screen.getByLabelText("Full name")).toHaveValue("Edited Manager");
    expect(screen.getByRole("button", { name: "Save user" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
    expect(updateManagerCredentials).toHaveBeenCalledOnce();
  });

  it("refreshes after a confirmed save", async () => {
    vi.mocked(updateManagerCredentials).mockResolvedValue({ ok: true });
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("User saved.");
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("displays an authorization error without reporting success", async () => {
    vi.mocked(updateManagerCredentials).mockResolvedValue({ ok: false, message: "You do not have permission to manage this employee." });
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("You do not have permission");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("also handles rejected responses for House Lead accounts", async () => {
    vi.mocked(saveQaAccount).mockRejectedValue(new Error("Connection closed"));
    const houseLead = { ...person, key: "user:example", manager: null,
      user: { qaMemberId: "example-member", qaMemberActive: true } } as ConfigPerson;
    render(<ConfigAccountEditor person={houseLead} managers={[]} homes={[]}
      currentUserId="director-user" teamHierarchyReady />);
    fireEvent.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The server could not confirm this change.");
    expect(refresh).not.toHaveBeenCalled();
  });
});

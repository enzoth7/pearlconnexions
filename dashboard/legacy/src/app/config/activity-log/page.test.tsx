import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { requireSection } from "@/lib/auth";
import ActivityLogPage from "./page";

vi.mock("@/lib/auth", () => ({ requireSection: vi.fn() }));

describe("Activity log", () => {
  it("combines changes, sign-ins and missing-login status in one chronological table", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null, data: {
      as_of: "2026-11-03T19:00:00Z",
      events: [
        { event_id: "login:1", occurred_at: "2026-11-03T18:00:00Z", user_name: "Joel Samuel", table_name: "sign_in", operation: "LOGIN", record_label: "" },
        { event_id: "change:2", occurred_at: "2026-11-03T17:00:00Z", user_name: "Simmone Reid", table_name: "actions", operation: "UPDATE", record_label: "A-25" },
      ],
      users: [
        { manager_id: "joel", user_id: "user-joel", name: "Joel Samuel", email: "admin@example.com", last_sign_in_at: "2026-11-03T18:00:00Z", sign_in_count: 1 },
        { manager_id: "simmone", user_id: "user-simmone", name: "Simmone Reid", email: "hr@example.com", last_sign_in_at: "2026-10-10T12:00:00Z", sign_in_count: 0 },
        { manager_id: "new", user_id: null, name: "New Manager", email: null, last_sign_in_at: null, sign_in_count: 0 },
      ],
    } });
    vi.mocked(requireSection).mockResolvedValue({ supabase: { rpc } } as never);

    render(await ActivityLogPage());

    expect(requireSection).toHaveBeenCalledWith("settings.activity_log");
    expect(rpc).toHaveBeenCalledWith("get_activity_log");
    const table = screen.getByRole("table");
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(within(table).getByText("Signed in")).toBeInTheDocument();
    expect(within(table).getByText("Updated action · A-25")).toBeInTheDocument();
    expect(within(table).getByText("Last signed in · over 7 days ago")).toBeInTheDocument();
    expect(within(table).getByText("No login account")).toBeInTheDocument();
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(/Joel Samuel.*Signed in/);
    const userFilter = screen.getByRole("button", { name: "Filter by user" });
    expect(userFilter.closest("th")).toHaveTextContent("User");
    expect(userFilter).toHaveTextContent("Users");
    expect(userFilter.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.pointerDown(userFilter, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Simmone Reid" }));
    expect(within(table).getByText("Updated action · A-25")).toBeInTheDocument();
    expect(within(table).getByText("Last signed in · over 7 days ago")).toBeInTheDocument();
    expect(within(table).queryByRole("row", { name: /Joel Samuel/ })).not.toBeInTheDocument();
    expect(within(table).queryByText("No login account")).not.toBeInTheDocument();
    fireEvent.pointerDown(userFilter, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "All users" }));
    expect(within(table).getByRole("row", { name: /Joel Samuel/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Login activity" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recent activity" })).not.toBeInTheDocument();
  });
});

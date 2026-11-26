// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ArchiveTable } from "@/workbook/components/archive-table";
import type { ActionRecord } from "@/workbook/lib/utils";

const action = (reference: string, title: string, manager: string, signer: string): ActionRecord => ({
  id: reference, reference, title, workstream_id: "w", workstream: { id: "w", name: "Business Development" },
  priority: null, base_status: "Not Started", date_added: null, deadline: null, extended_deadline: null, completed_at: "2026-11-20",
  participants: [{ id: `${reference}-p`, responsibility_type: "Owner", responsibility_text: "Lead", manager: { id: manager, name: manager, role_title: null } }],
  signoffs: [{ id: `${reference}-s`, signed_off_at: "2026-11-21T10:00:00Z", signed_off_by_name: signer }],
});
const actions = [
  action("BD01", "Weekly newsletter campaign", "Zulaikha Halim", "Joel Samuel"),
  action("HR02", "Staff rota review", "Simmone Reid", "Simmone Reid / Joel Samuel"),
];
afterEach(cleanup);

describe("completed actions search", () => {
  it("filters by reference, words in the action and people, and says when nothing matches", () => {
    render(<ArchiveTable actions={actions} />);
    const box = screen.getByRole("searchbox");
    fireEvent.change(box, { target: { value: "hr02" } });
    expect(screen.queryByText("Weekly newsletter campaign")).toBeNull();
    expect(screen.getByText("Staff rota review")).toBeTruthy();
    fireEvent.change(box, { target: { value: "zulaikha newsletter" } });
    expect(screen.getByText("Weekly newsletter campaign")).toBeTruthy();
    expect(screen.queryByText("Staff rota review")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1 of 2 completed actions");
    fireEvent.change(box, { target: { value: "nothing like this" } });
    expect(screen.getByText("No completed actions match this search")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Weekly newsletter campaign")).toBeTruthy();
    expect(screen.getByText("Staff rota review")).toBeTruthy();
  });
});

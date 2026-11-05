// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QaCaseRegister } from "../legacy/src/components/qa-case-register";
import { QaMonthlyReport } from "../legacy/src/components/qa-monthly-report";
import { emptyCase } from "../legacy/src/lib/qa-capture";
import { saveCase } from "../legacy/src/lib/qa-cases-client";
import { saveGovernance } from "@/lib/governance";
vi.mock("../legacy/src/lib/qa-cases-client", () => ({ saveCase: vi.fn(), savePerson: vi.fn(), appendCaseNote: vi.fn() }));
vi.mock("@/lib/governance", async original => ({ ...await original<typeof import("@/lib/governance")>(), saveGovernance: vi.fn() }));
const home = { id: "00000000-0000-4000-8000-000000000101", code: "CH901", name: "Example home", address: null, provision: "Supported Living" as const, total_beds: null, active: true };
const person = { id: "00000000-0000-4000-8000-000000000201", version: 1, home_id: home.id, code: "P01", alias: "Example person", active: true };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(saveCase).mockResolvedValue({ ok: false, message: "Connection unavailable. Entries retained." }); vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { callback(); return 1; }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("case form interactions", () => {
  it("retains an incomplete risk draft on failed save and shows field errors only when registering", async () => {
    render(<QaCaseRegister kind="risks" homes={[home]} records={[]} people={[person]} risks={[]} canManageMaintenance={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Add individual risk" }));
    fireEvent.change(screen.getByLabelText("Short title"), { target: { value: "Individual support concern" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Connection unavailable. Entries retained.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Register record" }).hasAttribute("disabled")).toBe(false));
    expect(vi.mocked(saveCase).mock.calls[0][0].is_draft).toBe(true);
    expect((screen.getByLabelText("Short title") as HTMLInputElement).value).toBe("Individual support concern");
    fireEvent.click(screen.getByRole("button", { name: "Register record" }));
    await screen.findByText("Enter one person.");
    expect(saveCase).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Area or activity")).toBeNull();
  });
  it("accepts a person directly in the risk form without a separate register", async () => {
    render(<QaCaseRegister kind="risks" homes={[home]} records={[]} people={[]} risks={[]} canManageMaintenance={false} />);
    expect(screen.queryByText("People in this home")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add individual risk" }));
    fireEvent.change(screen.getByLabelText("Person", { exact: true }), { target: { value: person.alias } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(saveCase).toHaveBeenCalled());expect(vi.mocked(saveCase).mock.calls[0][0].data.person_name).toBe(person.alias);
  });
  it("allows editing saved draft reviews but locks registered reviews", () => {
    const draft = { ...emptyCase("risks",home.id), version: 1, title: "Draft assessment", reviews: [{ id: crypto.randomUUID(), reviewed_on: "", author: "", outcome: "", residual_level: "", next_review_on: "" }] };
    render(<QaCaseRegister kind="risks" homes={[home]} records={[draft]} people={[person]} risks={[]} canManageMaintenance={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Open\s*Draft assessment/ }));
    expect((screen.getByLabelText("Reviewed by") as HTMLInputElement).matches(":disabled")).toBe(false);
  });
  it("renders incidents with separate safeguarding and notification inputs", () => {
    render(<QaCaseRegister kind="incidents" homes={[home]} records={[]} people={[person]} risks={[]} canManageMaintenance={false} />);
    expect(screen.queryByText("People in this home")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add incident" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Person involvement" }));
    fireEvent.click(screen.getByRole("option", { name: "Identified people" }));
    expect(screen.getByLabelText("People involved")).toBeTruthy();
    expect(screen.getByLabelText("Safeguarding concern")).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Notification to management" }));
    fireEvent.click(screen.getByRole("option", { name: "Notified" }));
    expect(screen.getByLabelText("Management notification time (London)")).toBeTruthy();
    expect(screen.queryByLabelText("Reported within 24 hours")).toBeNull();
  });
  it("opens the source record from a follow-up link", async () => {
    const incident = { ...emptyCase("incidents", home.id), title: "Medication support concern", reference: "INC-0013", version: 1, is_draft: false };
    render(<QaCaseRegister kind="incidents" homes={[home]} records={[incident]} people={[]} risks={[]} canManageMaintenance={false} initialRecordId={incident.id} />);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "INC-0013" })).toBeTruthy();
  });
});
describe("monthly measurements", () => {
  it("saves incomplete quantities as a draft and prevents incomplete submission", async () => {
    vi.mocked(saveGovernance).mockResolvedValue({ ok: true, message: "Draft saved.", version: 2 });
    render(<QaMonthlyReport id="report" initialVersion={1} initialStatus="draft" home={home} month="2026-11" questions={[]} initialBody={{ answers: {}, occupied_beds: "0", records_confirmed: true }} records={[]} director={false} reopenReason={null} snapshotAt={null} formVersion={3} />);
    expect(screen.getByText(/Capacity pending/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Expected (records)", { selector: "#daily_records-expected" }), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));await screen.findByText("Draft saved.");
    const request = vi.mocked(saveGovernance).mock.calls[0][1] as { body: { measurements: Record<string,{expected:string}> } };
    expect(request.body.measurements.daily_records.expected).toBe("30");
    await waitFor(() => expect(screen.getByRole("button", { name: "Send to director" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Send to director" }));
    await screen.findByRole("heading", { name: "Outstanding fields" });expect(saveGovernance).toHaveBeenCalledTimes(1);
  });
});

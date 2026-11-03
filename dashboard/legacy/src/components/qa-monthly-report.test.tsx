import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QaMonthlyReport } from "./qa-monthly-report";
import { saveGovernance } from "@/lib/governance";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/governance", async original => ({
  ...await original<typeof import("@/lib/governance")>(), saveGovernance: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const props = {
  id: "report", initialVersion: 1, initialStatus: "draft",
  home: { id: "home", code: "CH1", name: "Home", address: null, provision: "Supported Living" as const, total_beds: 3, active: true },
  month: "2026-11",
  questions: [
    { code: "core", section: 1, label: "Staff records complete?", provisions: [] },
    { code: "safety", section: 3, label: "Fire checks completed?", provisions: [] },
    { code: "children", section: 2, label: "School attendance checked?", provisions: ["Children's Home" as const] },
  ],
  initialBody: { answers: {}, occupied_beds: "", records_confirmed: false },
  records: [], director: false, reopenReason: null, snapshotAt: null,
};

describe("monthly report editor", () => {
  it("shows the full report in sections without steps or progress controls", () => {
    render(<QaMonthlyReport {...props} accessibleRegisters={[]} />);
    for (const section of ["Home & occupancy", "Team & records", "Safety & property", "Registers", "Review & send"]) {
      expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Average occupied beds during the month")).toBeInTheDocument();
    expect(screen.getByText("Staff records complete?")).toBeInTheDocument();
    expect(screen.getByText("Fire checks completed?")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Report steps" })).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open register" })).not.toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("asks for an explanation of No and hides questions for other services", () => {
    render(<QaMonthlyReport {...props} />);
    fireEvent.click(screen.getAllByRole("radio", { name: "No" })[0]);
    expect(screen.getByLabelText("What is outstanding and what happens next?")).toBeInTheDocument();
    expect(screen.queryByText("School attendance checked?")).not.toBeInTheDocument();
  });

  it("shows outstanding fields when sending an incomplete report", () => {
    render(<QaMonthlyReport {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Send to director" }));
    expect(screen.getByRole("heading", { name: "Outstanding fields" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Complete the outstanding fields");
    expect(saveGovernance).not.toHaveBeenCalled();
  });

  it("sends a completed report with answers from every section", async () => {
    vi.mocked(saveGovernance).mockResolvedValue({ ok: true, message: "Report sent.", version: 2 });
    render(<QaMonthlyReport {...props} />);
    fireEvent.change(screen.getByLabelText("Average occupied beds during the month"), { target: { value: "2" } });
    for (const radio of screen.getAllByRole("radio", { name: "Yes" })) fireEvent.click(radio);
    fireEvent.click(screen.getByLabelText(/I confirm the incident/));
    fireEvent.click(screen.getByRole("button", { name: "Send to director" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Report sent.");
    expect(vi.mocked(saveGovernance)).toHaveBeenCalledWith("/api/governance", expect.objectContaining({
      operation: "submit", body: expect.objectContaining({ occupied_beds: "2", records_confirmed: true }),
    }));
  });

  it("keeps entries after an unconfirmed save", async () => {
    vi.mocked(saveGovernance).mockResolvedValue({ ok: false, message: "Connection interrupted" });
    render(<QaMonthlyReport {...props} />);
    const occupancy = screen.getByLabelText("Average occupied beds during the month");
    fireEvent.change(occupancy, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Connection interrupted");
    expect(occupancy).toHaveValue(2);
  });

  it("locks a submitted report for managers", () => {
    render(<QaMonthlyReport {...props} initialStatus="submitted" />);
    expect(screen.getByLabelText("Average occupied beds during the month")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(screen.queryByText("Director review")).not.toBeInTheDocument();
  });

  it("shows Reviews-only access as read-only", () => {
    render(<QaMonthlyReport {...props} canEditReport={false} />);
    expect(screen.getByLabelText("Average occupied beds during the month")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reviews" })).toHaveAttribute("href", "/qa/reviews");
  });
});

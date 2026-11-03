import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { loadReportRows } from "@/lib/qa-report-rows";
import { requireGovernance } from "@/lib/auth";

const { select, eq, order, rpc } = vi.hoisted(() => ({
  select: vi.fn(), eq: vi.fn(), order: vi.fn(), rpc: vi.fn(),
}));
vi.mock("@/lib/qa-report-rows", () => ({ loadReportRows: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireGovernance: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("quality overview", () => {
  it("shows isolated example reports and scenarios to a director", async () => {
    const query = { select, eq, order };
    select.mockReturnValue(query);
    eq.mockReturnValue(query);
    order.mockResolvedValue({ data: [{
      id: "sample", status: "submitted", qa_homes: { name: "Sample home", provision: "Supported Living" },
      qa_report_forms: { body: { occupied_beds: "2", records_confirmed: true, answers: { safety: { answer: "yes", note: "" } } },
        snapshot: { preview_manager: "Sample lead", questions: [{ code: "safety", label: "Safety checks complete?", section: 3, provisions: [] }],
          records: [{ kind: "incidents", title: "Illustrative incident", status: "Closed", occurred_on: "2026-10-12", data: { description: "Sample only" } },
            { kind: "risks", title: "Illustrative risk", status: "Open", occurred_on: "2026-10-13", data: { priority: "Moderate" } }] } },
    }], error: null });
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [], context: { role: "director" } } as never);
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: { from: () => query, rpc } } as never);

    render(await Page({ searchParams: Promise.resolve({ view: "demo" }) }));
    expect(screen.getByText("Example data · October 2026")).toBeInTheDocument();
    expect(screen.getByText(/Sample home · Sample lead/)).toBeInTheDocument();
    expect(screen.getByText("Illustrative incident")).toBeInTheDocument();
    expect(screen.getByText("Illustrative risk")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checklist by home" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reports by home" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to live data" })).toHaveAttribute("href", "/qa");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps managers on live data even if they request the demo URL", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [{ id: "live", home: "Live home", month: "2026-10", status: "draft", formVersion: 2, checklist: null }],
      context: { role: "manager", sections: ["qa.overview"] } } as never);
    rpc.mockResolvedValue({ data: [], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: { rpc, from: () => { throw new Error("Demo query must not run"); } } } as never);

    render(await Page({ searchParams: Promise.resolve({ view: "demo" }) }));
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
    expect(screen.getByText("Results will appear when a monthly report is submitted. Drafts do not count as completed checks.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reports by home" })).not.toBeInTheDocument();
    expect(screen.queryByText("Example data · October 2026")).not.toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("qa_visible_record_counts");
  });
});

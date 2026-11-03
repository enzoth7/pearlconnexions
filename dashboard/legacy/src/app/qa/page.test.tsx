import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { loadReportRows } from "@/lib/qa-report-rows";
import { requireGovernance } from "@/lib/auth";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/qa-report-rows", () => ({ loadReportRows: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireGovernance: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("quality overview", () => {
  it("shows reports and register counts in the normal view without a preview switch", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [
      { id: "a", homeId: "home-a", home: "Brambles Acre", month: "2026-10", status: "submitted", formVersion: 2, checklist: 0.87 },
      { id: "b", homeId: "home-b", home: "Coulsdon", month: "2026-10", status: "draft", formVersion: 2, checklist: null },
    ], context: { role: "director" } } as never);
    rpc.mockResolvedValue({ data: [{ kind: "incidents", status: "Monitoring", total: 1 }], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: { rpc } } as never);
    render(await Page());
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checklist by home" })).toBeInTheDocument();
    expect(screen.getByText("Brambles Acre")).toBeInTheDocument();
    expect(screen.queryByText("Preview with example data")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reports by home" })).not.toBeInTheDocument();
  });

  it("does not treat an unfinished report as a compliance result", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [{ id: "a", homeId: "home-a", home: "Friday Rd", month: "2026-10", status: "draft", formVersion: 2, checklist: null }], context: { role: "house_lead", sections: ["qa.overview"] } } as never);
    rpc.mockResolvedValue({ data: [], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: { rpc } } as never);
    render(await Page());
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
    expect(screen.getByText("Results will appear when a monthly report is submitted. Drafts do not count as completed checks.")).toBeInTheDocument();
  });
});

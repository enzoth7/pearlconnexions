import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { loadReportRows } from "@/lib/qa-report-rows";
import { requireGovernance } from "@/lib/auth";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
const homes = [
  { id: "home-a", name: "Brambles Acre", provision: "Children's Home" },
  { id: "home-b", name: "Coulsdon", provision: "Supported Accommodation" },
];
function directorSupabase(safeguarding: { id: string; data: { safeguarding: string } }[] = []) {
  return { rpc, from: () => ({ select: () => ({
    eq: () => ({ order: async () => ({ data: homes, error: null }) }),
    in: async () => ({ data: safeguarding, error: null }),
  }) }) };
}
vi.mock("@/lib/qa-report-rows", () => ({ loadReportRows: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireGovernance: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("quality overview", () => {
  it("shows reports and register counts in the normal view without a preview switch", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [
      { id: "a", homeId: "home-a", home: "Brambles Acre", month: "2026-10", status: "submitted", formVersion: 2, checklist: 0.87 },
      { id: "b", homeId: "home-b", home: "Coulsdon", month: "2026-10", status: "draft", formVersion: 2, checklist: null },
    ], context: { role: "director" } } as never);
    rpc.mockResolvedValue({ data: [{ id: "incident-a", kind: "incidents", home_id: "home-a", title: "Recorded incident", occurred_on: "2026-10-17", status: "Monitoring", created_at: "2026-10-17T12:00:00Z" }], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: directorSupabase() } as never);
    render(await Page());
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "House performance" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What needs attention" })).toBeTruthy();
    expect(screen.getByText("Brambles Acre")).toBeTruthy();
    expect(screen.queryByText("Preview with example data")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Reports by home" })).toBeNull();
  });

  it("does not treat an unfinished report as a compliance result", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [{ id: "a", homeId: "home-a", home: "Friday Rd", month: "2026-10", status: "draft", formVersion: 2, checklist: null }], context: { role: "house_lead", sections: ["qa.overview"], homes: [{ id: "home-a", name: "Friday Rd", provision: "Children's Home" }] } } as never);
    rpc.mockResolvedValue({ data: [], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: { rpc } } as never);
    render(await Page());
    expect(screen.getByText("0 / 1")).toBeTruthy();
    expect(screen.getAllByText("No applicable quantities").length).toBeGreaterThan(0);
    expect(screen.getByText("Not available")).toBeTruthy();
  });

  it("filters reports and incidents by home, month and service type", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [
      { id: "a", homeId: "home-a", home: "Brambles Acre", month: "2026-10", status: "submitted", formVersion: 2, checklist: 0.87 },
      { id: "b", homeId: "home-b", home: "Coulsdon", month: "2026-10", status: "submitted", formVersion: 2, checklist: 0.70 },
      { id: "c", homeId: "home-a", home: "Brambles Acre", month: "2026-09", status: "submitted", formVersion: 2, checklist: 0.90 },
    ], context: { role: "director" } } as never);
    rpc.mockResolvedValue({ data: [
      { id: "incident-a", kind: "incidents", home_id: "home-a", title: "Incident at Brambles", occurred_on: "2026-10-17", status: "Monitoring", created_at: "2026-10-17T12:00:00Z" },
      { id: "incident-b", kind: "incidents", home_id: "home-b", title: "Incident at Coulsdon", occurred_on: "2026-10-18", status: "Monitoring", created_at: "2026-10-18T12:00:00Z" },
    ], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: directorSupabase() } as never);
    render(await Page({ searchParams: Promise.resolve({ home: "home-a", month: "2026-10", provision: "Children's Home" }) }));
    expect(screen.getByRole("combobox", { name: "Filter by home" }).textContent).toContain("Brambles Acre");
    expect(screen.getByRole("combobox", { name: "Filter by month" }).textContent).toContain("October 2026");
    expect(screen.getByRole("combobox", { name: "Filter by service type" }).textContent).toContain("Children's Home");
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(screen.getByText("Incident at Brambles")).toBeTruthy();
    expect(screen.queryByText("Incident at Coulsdon")).toBeNull();
    expect(screen.queryByText("Coulsdon")).toBeNull();
  });

  it("links safeguarding concerns and pending assessments to the incident filters", async () => {
    vi.mocked(loadReportRows).mockResolvedValue({ rows: [
      { id: "a", homeId: "home-a", home: "Brambles Acre", month: "2026-10", status: "submitted", formVersion: 2, checklist: 0.87 },
    ], context: { role: "director" } } as never);
    rpc.mockResolvedValue({ data: [
      { id: "incident-a", kind: "incidents", home_id: "home-a", title: "Concern", occurred_on: "2026-10-17", status: "Monitoring", created_at: "2026-10-17T12:00:00Z" },
      { id: "incident-b", kind: "incidents", home_id: "home-a", title: "To assess", occurred_on: "2026-10-18", status: "Follow up", created_at: "2026-10-18T12:00:00Z" },
    ], error: null });
    vi.mocked(requireGovernance).mockResolvedValue({ supabase: directorSupabase([
      { id: "incident-a", data: { safeguarding: "yes" } },
      { id: "incident-b", data: { safeguarding: "pending" } },
    ]) } as never);
    render(await Page());
    expect(screen.getByRole("link", { name: /Safeguarding concerns/ }).getAttribute("href")).toBe("/qa/incidents?safeguarding=yes");
    expect(screen.getByRole("link", { name: /Safeguarding awaiting assessment/ }).getAttribute("href")).toBe("/qa/incidents?safeguarding=pending");
  });
});

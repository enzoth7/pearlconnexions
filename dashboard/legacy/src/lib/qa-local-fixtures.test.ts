import { afterEach, describe, expect, it, vi } from "vitest";
import { localRecords, withLocalReports } from "./qa-local-fixtures";
import type { QaReportRow } from "@/components/qa-reports-list";

const row: QaReportRow = {
  id: "real-draft", homeId: "home-1", home: "Brambles Acre", month: "2026-10",
  status: "draft", version: 1, formVersion: 2, checklist: null,
};
afterEach(() => vi.unstubAllEnvs());

describe("local QA content", () => {
  it("fills the current views in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const [report] = withLocalReports([row]);
    expect(report.id).toBe("local-report-home-1");
    expect(report.status).toBe("submitted");
    expect(report.checklist).toBeCloseTo(14 / 15);
    expect(localRecords("incidents", [{ id: "home-1", name: "Brambles Acre" }])).toHaveLength(1);
    expect(localRecords("maintenance", [{ id: "home-1", name: "Brambles Acre" }])).toHaveLength(1);
  });

  it("does not add records to a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(withLocalReports([row])).toEqual([row]);
    expect(localRecords("risks", [{ id: "home-1", name: "Brambles Acre" }])).toEqual([]);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QaReportsList, type QaReportRow } from "./qa-reports-list";

afterEach(cleanup);

const rows: QaReportRow[] = [
  { id: "a", homeId: "a", home: "Home A", month: "2026-10", status: "submitted", version: 1, formVersion: 3, checklist: 0.4 },
  { id: "b", homeId: "b", home: "Home B", month: "2026-10", status: "submitted", version: 1, formVersion: 3, checklist: 0.7 },
  { id: "c", homeId: "c", home: "Home C", month: "2026-10", status: "approved", version: 1, formVersion: 3, checklist: 0.85 },
  { id: "d", homeId: "d", home: "Home D", month: "2026-10", status: "approved", version: 1, formVersion: 3, checklist: 0.95 },
];

describe.each([false, true])("checklist colors in %s view", reviews => {
  it("uses the QA bands in the checklist column", () => {
    render(<QaReportsList rows={rows} director reviews={reviews} />);
    expect(screen.getByText("40.00% · Inadequate").className).toContain("bg-red-100");
    expect(screen.getByText("70.00% · Requires improvement").className).toContain("bg-amber-100");
    expect(screen.getByText("85.00% · Good").className).toContain("bg-green-100");
    expect(screen.getByText("95.00% · Outstanding").className).toContain("bg-green-700");
  });
});

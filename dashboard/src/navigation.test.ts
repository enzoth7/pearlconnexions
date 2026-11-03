import { describe, expect, it, vi } from "vitest";
import { navigate } from "./shims/navigation";
import { canLoadRoute, matchRoute, preloadPaths } from "./routes";
import type { AccessContext } from "./shims/auth";

describe("browser navigation", () => {
  it("changes the URL before a pending data request completes", () => {
    const events = new EventTarget();
    const pushState = vi.fn();
    const scrollTo = vi.fn();
    vi.stubGlobal("window", Object.assign(events, { scrollTo }));
    vi.stubGlobal("history", { pushState, replaceState: vi.fn() });
    let requestFinished = false;
    events.addEventListener("pearl:navigate", () => { void new Promise(resolve => setTimeout(resolve, 200)).then(() => { requestFinished = true; }); });
    navigate("/qa/monthly-reports");
    expect(pushState).toHaveBeenCalledWith(null, "", "/qa/monthly-reports");
    expect(requestFinished).toBe(false);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    vi.unstubAllGlobals();
  });

  it("matches direct links to report and action details", () => {
    expect(matchRoute("/qa/monthly-reports/4a1524fe-e1c0-4682-bc27-32bbfa95c957")?.id).toBe("4a1524fe-e1c0-4682-bc27-32bbfa95c957");
    expect(matchRoute("/workbook/actions/4a1524fe-e1c0-4682-bc27-32bbfa95c957")?.route.workbook).toBe(true);
    expect(matchRoute("/director/reviews/4a1524fe-e1c0-4682-bc27-32bbfa95c957")?.route.section).toBe("qa.reviews");
  });

  it("preloads only enabled sections", () => {
    const context = { role: "house_lead", qaEnabled: true, workbookRole: null, finance: false, hr: false, maintenance: false, sections: ["qa.monthly_reports"], homes: [] } as unknown as AccessContext;
    expect(preloadPaths(context)).toContain("/qa/monthly-reports");
    expect(preloadPaths(context)).not.toContain("/qa");
    expect(preloadPaths(context)).not.toContain("/team");
    expect(canLoadRoute(context, matchRoute("/workbook/actions")!.route)).toBe(false);
  });
});

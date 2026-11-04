// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

const state = vi.hoisted(() => ({ workbookLoads: 0, editLoads: 0, accessLoads: 0,
  authCallback: null as null | ((event: string, session?: { user: { id: string } }) => void) }));
afterEach(() => cleanup());
vi.mock("./shims/auth", () => ({
  getAccessContext: async () => { state.accessLoads++; return { userId: "director", name: "Director", email: "", role: "director", workbookRole: "director", qaEnabled: true, finance: false, hr: false, isAdmin: true, homes: [] }; },
  clearAccessContext: () => {},
}));
vi.mock("./shims/supabase", () => ({ supabase: { auth: { onAuthStateChange: (callback: typeof state.authCallback) => { state.authCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; } } } }));
vi.mock("./shims/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("./routes", async () => {
  const { createElement } = await import("react");
  const { navigate } = await import("./shims/navigation");
  const qa = { section: "qa.overview", load: async () => createElement("button", { onClick: () => navigate("/workbook") }, "Go workbook") };
  const edit = { section: "qa.monthly_reports", load: async () => {
    state.editLoads++;
    return createElement("input", { "aria-label": "Draft", defaultValue: "" });
  } };
  const workbook = { section: "workbook", load: async () => {
    state.workbookLoads++;
    await new Promise(resolve => setTimeout(resolve, 150));
    return createElement("button", { onClick: () => navigate("/qa") }, "Go QA");
  } };
  return { matchRoute: (path: string) => path === "/qa" ? { route: qa } : path === "/qa/edit" ? { route: edit } : path === "/workbook" ? { route: workbook } : null,
    canLoadRoute: () => true, preloadPaths: () => [] };
});

it("keeps an unfinished form when the tab becomes visible or the same session is confirmed", async () => {
  window.scrollTo = vi.fn();
  history.replaceState(null, "", "/qa/edit");
  render(<App />);
  const draft = await screen.findByRole<HTMLInputElement>("textbox", { name: "Draft" });
  fireEvent.change(draft, { target: { value: "Unfinished report" } });
  const loads = state.editLoads;
  const accessLoads = state.accessLoads;

  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    state.authCallback?.("SIGNED_IN", { user: { id: "director" } });
    await Promise.resolve();
  });

  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Draft" }).value).toBe("Unfinished report");
  expect(state.editLoads).toBe(loads);
  expect(state.accessLoads).toBe(accessLoads);

  await act(async () => { state.authCallback?.("SIGNED_OUT"); });
  expect(screen.queryByRole("textbox", { name: "Draft" })).toBeNull();
});

it("reuses an opened section while its query is delayed", async () => {
  window.scrollTo = vi.fn();
  history.replaceState(null, "", "/qa");
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Go workbook" }));
  expect(location.pathname).toBe("/workbook");
  fireEvent.click(await screen.findByRole("button", { name: "Go QA" }));
  expect(location.pathname).toBe("/qa");
  fireEvent.click(await screen.findByRole("button", { name: "Go workbook" }));
  expect(location.pathname).toBe("/workbook");
  expect(screen.getByRole("button", { name: "Go QA" })).toBeTruthy();
  expect(state.workbookLoads).toBe(1);
});

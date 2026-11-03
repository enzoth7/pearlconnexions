// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import App from "./App";

const state = vi.hoisted(() => ({ workbookLoads: 0 }));
vi.mock("./shims/auth", () => ({
  getAccessContext: async () => ({ userId: "director", name: "Director", email: "", role: "director", workbookRole: "director", qaEnabled: true, finance: false, hr: false, isAdmin: true, homes: [] }),
  clearAccessContext: () => {},
}));
vi.mock("./shims/supabase", () => ({ supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }));
vi.mock("./shims/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("./routes", async () => {
  const { createElement } = await import("react");
  const { navigate } = await import("./shims/navigation");
  const qa = { section: "qa.overview", load: async () => createElement("button", { onClick: () => navigate("/workbook") }, "Go workbook") };
  const workbook = { section: "workbook", load: async () => {
    state.workbookLoads++;
    await new Promise(resolve => setTimeout(resolve, 150));
    return createElement("button", { onClick: () => navigate("/qa") }, "Go QA");
  } };
  return { matchRoute: (path: string) => path === "/qa" ? { route: qa } : path === "/workbook" ? { route: workbook } : null,
    canLoadRoute: () => true, preloadPaths: () => [] };
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

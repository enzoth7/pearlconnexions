// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { routes } from "./routes";
import { RouteRedirect } from "./shims/navigation";

describe("route modules", () => {
  it.each(["/login", "/forgot-password", "/update-password"])("loads %s directly", async path => {
    const page = await routes[path].load(new URLSearchParams());
    expect(page).toBeTruthy();
  });

  it.each(Object.keys(routes).filter(path => !["/login", "/forgot-password", "/update-password"].includes(path)))("loads %s without a Next server", async path => {
    let page;
    try {
      page = await routes[path].load(new URLSearchParams(), path.includes(":id") ? "4a1524fe-e1c0-4682-bc27-32bbfa95c957" : undefined);
    } catch (error) {
      expect(error).toBeInstanceOf(RouteRedirect);
      return;
    }
    expect(page).toBeTruthy();
  });
});

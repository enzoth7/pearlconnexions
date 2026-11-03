// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./shims/auth", async importOriginal => ({ ...await importOriginal<typeof import("./shims/auth")>(), getAccessContext: async () => null }));

it("redirects a direct protected link to sign in", async () => {
  window.scrollTo = vi.fn();
  history.replaceState(null, "", "/qa/monthly-reports");
  render(<App />);
  await waitFor(() => expect(location.pathname).toBe("/login"));
});

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./shims/auth", async importOriginal => ({ ...await importOriginal<typeof import("./shims/auth")>(), getAccessContext: async () => null }));

it("moves between auth screens without a document request and supports browser history", async () => {
  window.scrollTo = vi.fn();
  history.replaceState(null, "", "/login");
  render(<App />);
  const link = await screen.findByRole("link", { name: "Forgot password?" }, { timeout: 10000 });
  fireEvent.click(link);
  expect(location.pathname).toBe("/forgot-password");
  await screen.findByRole("button", { name: "Send reset link" }, { timeout: 10000 });
  history.back();
  await waitFor(() => expect(location.pathname).toBe("/login"));
  await screen.findByRole("link", { name: "Forgot password?" }, { timeout: 10000 });
}, 15000);

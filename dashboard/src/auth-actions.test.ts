// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { login, requestPasswordReset, updatePassword } from "./shims/app-actions";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(async () => ({ error: { message: "Invalid login" } })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ error: null })),
}));
vi.mock("./shims/supabase", () => ({ supabase: { auth } }));

it("returns a login error without discarding the submitted values", async () => {
  const form = new FormData();
  form.set("email", "person@example.com");
  form.set("password", "incorrect");
  expect(await login({}, form)).toEqual({ message: "Invalid login" });
  expect(form.get("email")).toBe("person@example.com");
});

it("routes recovery to the password screen", async () => {
  const form = new FormData();
  form.set("email", "person@example.com");
  expect((await requestPasswordReset({}, form)).ok).toBe(true);
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", { redirectTo: `${location.origin}/auth/callback?next=/update-password` });
});

it("rejects mismatched passwords before contacting Supabase", async () => {
  const form = new FormData();
  form.set("password", "password123");
  form.set("confirm_password", "password456");
  expect((await updatePassword({}, form)).message).toBe("Passwords do not match.");
  expect(auth.updateUser).not.toHaveBeenCalled();
});

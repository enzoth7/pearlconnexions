import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireDirector: vi.fn(),
  requireHouseLead: vi.fn(),
  requireWorkspaceAdmin: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

const signInWithPassword = vi.fn();

function credentials(password: string, email = "manager@example.com") {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  form.set("next", "/workbook/actions");
  return form;
}

describe("unified dashboard sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  it.each(["old123", "old1234", "new12345", " padded password "])(
    "passes an existing password unchanged to Supabase (%s)",
    async password => {
      await expect(login({}, credentials(password))).rejects.toThrow("REDIRECT:/workbook/actions");
      expect(signInWithPassword).toHaveBeenCalledWith({ email: "manager@example.com", password });
      expect(redirect).toHaveBeenCalledWith("/workbook/actions");
    },
  );

  it("normalizes a pasted email before validation", async () => {
    await expect(login({}, credentials("old123", "  MANAGER@EXAMPLE.COM  "))).rejects.toThrow("REDIRECT:/workbook/actions");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "manager@example.com", password: "old123" });
  });

  it("requires a password", async () => {
    const result = await login({}, credentials(""));
    expect(result.errors?.password).toBeDefined();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("requires a valid email", async () => {
    const result = await login({}, credentials("old123", "not-an-email"));
    expect(result.errors?.email).toBeDefined();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("keeps Supabase in charge of rejecting invalid credentials", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const result = await login({}, credentials("old123"));
    expect(signInWithPassword).toHaveBeenCalledOnce();
    expect(result.message).toBe("Email or password is incorrect.");
    expect(redirect).not.toHaveBeenCalled();
  });
});

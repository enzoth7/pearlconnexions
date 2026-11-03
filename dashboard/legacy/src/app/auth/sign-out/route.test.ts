import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const signOut = vi.fn();
function request(switchMode: string | null = "1", origin = "http://localhost:3000") {
  const suffix = switchMode === null ? "" : `?switch=${switchMode}`;
  return new Request(`http://localhost:3000/auth/sign-out${suffix}`, { method: "POST", headers: { origin } });
}

describe("account exit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signOut } } as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  it("switches accounts with a full-page redirect after sign-out", async () => {
    const response = await POST(request());
    expect(signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?switch=1");
  });

  it("signs out to the normal login screen", async () => {
    const response = await POST(request(null));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("rejects requests from another origin before touching the session", async () => {
    const response = await POST(request("1", "https://other.example"));
    expect(response.status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});

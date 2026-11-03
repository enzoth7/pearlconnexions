// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getAccessContext } from "@/lib/auth";
import { saveQaAccount } from "@/app/actions";
import { updateManagerCredentials } from "@/workbook/actions";

vi.mock("@/lib/auth", () => ({ getAccessContext: vi.fn() }));
vi.mock("@/app/actions", () => ({ saveQaAccount: vi.fn() }));
vi.mock("@/workbook/actions", () => ({ updateManagerCredentials: vi.fn() }));

function request(kind = "manager", origin = "http://localhost:3000") {
  const data = new FormData();
  data.set("kind", kind);
  data.set("manager_id", "target-manager");
  data.set("name", "Changed name");
  return new Request("http://localhost:3000/api/settings/accounts", { method: "POST", headers: { origin }, body: data });
}

describe("account save endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccessContext).mockResolvedValue({ isAdmin: true, role: "director" } as Awaited<ReturnType<typeof getAccessContext>>);
    vi.mocked(updateManagerCredentials).mockResolvedValue({ ok: true });
    vi.mocked(saveQaAccount).mockResolvedValue({ ok: true });
  });

  it("rejects another origin without attempting a save", async () => {
    expect((await POST(request("manager", "https://outside.invalid"))).status).toBe(403);
    expect(updateManagerCredentials).not.toHaveBeenCalled();
  });

  it("returns a JSON session error", async () => {
    vi.mocked(getAccessContext).mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(updateManagerCredentials).not.toHaveBeenCalled();
  });

  it.each([{ role: "manager", isAdmin: true }, { role: "director", isAdmin: false }])("requires director and admin privileges (%j)", async context => {
    vi.mocked(getAccessContext).mockResolvedValue(context as Awaited<ReturnType<typeof getAccessContext>>);
    expect((await POST(request())).status).toBe(403);
    expect(updateManagerCredentials).not.toHaveBeenCalled();
  });

  it.each(["manager", "qa"])("runs the existing account validation for %s", async kind => {
    const response = await POST(request(kind));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    const save = kind === "manager" ? updateManagerCredentials : saveQaAccount;
    expect(save).toHaveBeenCalledOnce();
    expect(vi.mocked(save).mock.calls[0][0].get("name")).toBe("Changed name");
  });

  it("lets an authorised manager edit a direct employee account, not a House Lead", async () => {
    vi.mocked(getAccessContext).mockResolvedValue({ isAdmin: false, role: "pending", canManageEmployees: true } as Awaited<ReturnType<typeof getAccessContext>>);
    expect((await POST(request("manager"))).status).toBe(200);
    expect((await POST(request("qa"))).status).toBe(403);
    expect(saveQaAccount).not.toHaveBeenCalled();
  });

  it("preserves server errors instead of returning a success message", async () => {
    vi.mocked(updateManagerCredentials).mockResolvedValue({ ok: false, message: "Name could not be saved." });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, message: "Name could not be saved." });
  });

  it("rejects unknown account types", async () => {
    expect((await POST(request("unknown"))).status).toBe(400);
    expect(updateManagerCredentials).not.toHaveBeenCalled();
    expect(saveQaAccount).not.toHaveBeenCalled();
  });
});

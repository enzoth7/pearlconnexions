import { afterEach, describe, expect, it, vi } from "vitest";
import { accountSaveUnconfirmed, saveAccountChange } from "./account-save";

afterEach(() => vi.unstubAllGlobals());

describe("account save transport", () => {
  it.each(["manager", "qa"] as const)("sends %s edits through the accounts endpoint", async kind => {
    const request = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", request);
    const data = new FormData();
    data.set("name", "Changed name");
    expect(await saveAccountChange(kind, data)).toMatchObject({ ok: true });
    expect(request).toHaveBeenCalledWith("/api/settings/accounts", { method: "POST", credentials: "same-origin", body: data });
    expect(data.get("kind")).toBe(kind);
  });

  it("does not report an HTML response as a successful name change", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Sign in</html>", { headers: { "content-type": "text/html" } })));
    expect(await saveAccountChange("manager", new FormData())).toEqual({ ok: false, message: accountSaveUnconfirmed });
  });

  it("shows a concrete server validation error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: false, message: "This team member is not available." }, { status: 400 })));
    expect(await saveAccountChange("manager", new FormData())).toEqual({ ok: false, message: "This team member is not available." });
  });
});

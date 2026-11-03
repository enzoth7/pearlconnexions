import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { permissionSaveUnconfirmed, savePermissionChange } from "./permission-save";

const request = vi.fn();
describe("permission save transport", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", request); });
  afterEach(() => vi.unstubAllGlobals());

  it("posts to a stable JSON endpoint without Server Action references", async () => {
    request.mockResolvedValue(Response.json({ ok: true, message: "Permissions saved." }));
    const data = new FormData();
    data.set("user_id", "target-user");
    data.set("workbook", "on");
    const result = await savePermissionChange("panels", data);
    expect(request).toHaveBeenCalledWith("/api/settings/permissions", {
      method: "POST", credentials: "same-origin", body: data,
    });
    expect(data.get("kind")).toBe("panels");
    expect(data.get("workbook")).toBe("on");
    expect(result).toEqual({ ok: true, message: "Permissions saved." });
  });

  it("handles the HTML response that causes Next's unexpected-response error", async () => {
    request.mockResolvedValue(new Response("<html>Sign in</html>", { headers: { "content-type": "text/html" } }));
    await expect(savePermissionChange("panels", new FormData())).resolves.toEqual({ ok: false, message: permissionSaveUnconfirmed });
  });

  it("handles connection failures without throwing into React", async () => {
    request.mockRejectedValue(new Error("Connection closed"));
    expect(await savePermissionChange("qa", new FormData())).toMatchObject({ ok: false, message: permissionSaveUnconfirmed });
  });

  it("reports an expired session as a failed save", async () => {
    request.mockResolvedValue(Response.json({ ok: false, message: "Your session has expired." }, { status: 401 }));
    expect(await savePermissionChange("panels", new FormData())).toEqual({ ok: false, message: "Your session has expired." });
  });

  it.each([{}, { ok: "true" }, null])("rejects malformed response data (%j)", async payload => {
    request.mockResolvedValue(Response.json(payload));
    expect(await savePermissionChange("workbook", new FormData())).toMatchObject({ ok: false });
  });

  it("does not accept an unsuccessful HTTP response as success", async () => {
    request.mockResolvedValue(Response.json({ ok: true }, { status: 500 }));
    expect(await savePermissionChange("panels", new FormData())).toMatchObject({ ok: false });
  });
});

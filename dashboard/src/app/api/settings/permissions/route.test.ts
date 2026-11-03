// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getAccessContext } from "@/lib/auth";
import { saveQaHomeAssignments, saveWorkspacePermissions } from "@/app/actions";
import { setManagerPermission } from "@/workbook/actions";

vi.mock("@/lib/auth", () => ({ getAccessContext: vi.fn() }));
vi.mock("@/app/actions", () => ({ saveQaHomeAssignments: vi.fn(), saveWorkspacePermissions: vi.fn() }));
vi.mock("@/workbook/actions", () => ({ setManagerPermission: vi.fn() }));

function request(kind = "panels", origin = "http://localhost:3000") {
  const data = new FormData();
  data.set("kind", kind);
  data.set("user_id", "target-user");
  return new Request("http://localhost:3000/api/settings/permissions", { method: "POST", headers: { origin }, body: data });
}

describe("permissions endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccessContext).mockResolvedValue({ isAdmin: true, role: "director" } as Awaited<ReturnType<typeof getAccessContext>>);
    vi.mocked(saveWorkspacePermissions).mockResolvedValue({ ok: true, message: "Permissions saved." });
    vi.mocked(setManagerPermission).mockResolvedValue({ ok: true });
    vi.mocked(saveQaHomeAssignments).mockResolvedValue({ ok: true });
  });

  it("rejects requests from another origin before any write", async () => {
    expect((await POST(request("panels", "https://outside.invalid"))).status).toBe(403);
    expect(getAccessContext).not.toHaveBeenCalled();
    expect(saveWorkspacePermissions).not.toHaveBeenCalled();
  });

  it("returns JSON for expired sessions instead of an HTML login page", async () => {
    vi.mocked(getAccessContext).mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({ ok: false });
    expect(saveWorkspacePermissions).not.toHaveBeenCalled();
  });

  it.each([{ isAdmin: false, role: "director" }, { isAdmin: true, role: "manager" }])("rejects non-admin access (%j)", async context => {
    vi.mocked(getAccessContext).mockResolvedValue(context as Awaited<ReturnType<typeof getAccessContext>>);
    expect((await POST(request())).status).toBe(403);
    expect(saveWorkspacePermissions).not.toHaveBeenCalled();
  });

  it.each(["panels", "workbook", "qa"])("runs the existing validated save for %s", async kind => {
    const response = await POST(request(kind));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(kind === "panels" ? saveWorkspacePermissions : kind === "workbook" ? setManagerPermission : saveQaHomeAssignments).toHaveBeenCalledOnce();
  });

  it("lets an employee manager save sections and homes, but not Workbook actions", async () => {
    vi.mocked(getAccessContext).mockResolvedValue({ isAdmin: false, role: "pending", canManageEmployees: true } as Awaited<ReturnType<typeof getAccessContext>>);
    expect((await POST(request("panels"))).status).toBe(200);
    expect((await POST(request("qa"))).status).toBe(200);
    expect((await POST(request("workbook"))).status).toBe(403);
    expect(setManagerPermission).not.toHaveBeenCalled();
  });

  it("rejects invalid save types without invoking an action", async () => {
    expect((await POST(request("unknown"))).status).toBe(400);
    expect(saveWorkspacePermissions).not.toHaveBeenCalled();
    expect(setManagerPermission).not.toHaveBeenCalled();
    expect(saveQaHomeAssignments).not.toHaveBeenCalled();
  });

  it("does not report validation failures as successful saves", async () => {
    vi.mocked(saveWorkspacePermissions).mockResolvedValue({ message: "Invalid permission selection." });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, message: "Invalid permission selection." });
  });

  it("contains server failures in a JSON error response", async () => {
    vi.mocked(saveWorkspacePermissions).mockRejectedValue(new Error("Database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
  });
});

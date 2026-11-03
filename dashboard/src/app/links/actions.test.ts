import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { saveWorkspaceLinks } from "./actions";

vi.mock("@/lib/auth", () => ({ requireWorkspaceAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const links = { dashboard_url: "https://workbook-pc.vercel.app/", website_url: "https://www.pearlconnexions.com/" };
const single = vi.fn();
const select = vi.fn(() => ({ single }));
const eq = vi.fn(() => ({ select }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));

function form(dashboardUrl = links.dashboard_url, websiteUrl = links.website_url) {
  const data = new FormData();
  data.set("dashboard_url", dashboardUrl);
  data.set("website_url", websiteUrl);
  return data;
}

describe("shared workspace links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAdmin).mockResolvedValue({ supabase: { from } } as unknown as Awaited<ReturnType<typeof requireWorkspaceAdmin>>);
    single.mockResolvedValue({ data: links, error: null });
  });

  it("checks admin access before writing", async () => {
    vi.mocked(requireWorkspaceAdmin).mockRejectedValue(new Error("Forbidden"));
    await expect(saveWorkspaceLinks({}, form())).rejects.toThrow("Forbidden");
    expect(from).not.toHaveBeenCalled();
  });

  it.each(["javascript:alert(1)", "data:text/html,hello", "file:///private", "/relative", "https://user:password@example.com/", ""])(
    "rejects unsafe or incomplete addresses (%s)", async url => {
      const result = await saveWorkspaceLinks({}, form(url));
      expect(result.errors?.dashboard_url).toBeDefined();
      expect(update).not.toHaveBeenCalled();
    },
  );

  it("validates both addresses before saving either", async () => {
    const result = await saveWorkspaceLinks({}, form(links.dashboard_url, "javascript:alert(1)"));
    expect(result.errors?.website_url).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("saves both destinations together and refreshes Links", async () => {
    const result = await saveWorkspaceLinks({}, form("  https://workbook-pc.vercel.app  ", links.website_url));
    expect(update).toHaveBeenCalledWith(links);
    expect(eq).toHaveBeenCalledWith("id", true);
    expect(revalidatePath).toHaveBeenCalledWith("/links");
    expect(result).toMatchObject({ ok: true, links });
  });

  it("reports a failed save instead of claiming success", async () => {
    single.mockResolvedValue({ data: null, error: { message: "Denied" } });
    const result = await saveWorkspaceLinks({}, form());
    expect(result.ok).not.toBe(true);
    expect(result.message).toContain("Could not save");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireSection, requireGovernance } from "./auth";
const { selection, from } = vi.hoisted(() => ({ selection: { sections: ["qa.monthly_reports"] as string[] }, from: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`Redirect:${path}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: "manager", email: "manager@example.com" } } }) }, from,
  rpc: async () => ({ data: { sections: selection.sections, workbook: true, can_manage_employees: false, can_manage_logins: false, homes: [] }, error: null }),
}) }));
beforeEach(() => {
  selection.sections = ["qa.monthly_reports"];
  from.mockImplementation((table: string) => {
    const data = table === "profiles" ? { display_name: "Manager", role: "manager", manager_id: "manager-id" } : table === "managers" ? { can_manage_employees: false, can_manage_logins: false } : table === "qa_members" ? { active: true, display_name: "Manager", qa_member_homes: [] } : { qa: true, workbook: true, visible_sections: selection.sections };
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data, error: null }) };
    return query;
  });
});
describe("server section guards", () => {
  it("redirects a direct link to hidden Overview to the permitted monthly page", async () => {
    await expect(requireSection("qa.overview")).rejects.toThrow("Redirect:/qa/monthly-reports");
  });
  it("allows the QA layout while checking the concrete subpage separately", async () => {
    await expect(requireGovernance("qa")).resolves.toHaveProperty("context.userId", "manager");
    await expect(requireGovernance("qa", "qa.incidents")).rejects.toThrow("Redirect:/qa/monthly-reports");
    await expect(requireSection("qa.monthly_reports")).resolves.toHaveProperty("context.userId", "manager");
  });
  it("does not redirect endlessly when the user has no QA sections", async () => {
    selection.sections = [];
    await expect(requireGovernance("qa")).rejects.toThrow("Redirect:/workbook");
  });
  it("checks the two Settings tabs separately from employee action permissions", async () => {
    selection.sections = ["settings.houses"];
    await expect(requireSection("settings.houses")).resolves.toHaveProperty("context.canManageEmployees", false);
    await expect(requireSection("settings.users_permissions")).rejects.toThrow("Redirect:/workbook");
  });
  it("allows Activity log only when that tab is explicitly assigned", async () => {
    selection.sections = ["settings.activity_log"];
    await expect(requireSection("settings.activity_log")).resolves.toHaveProperty("context.canManageEmployees", false);
    await expect(requireSection("settings.houses")).rejects.toThrow("Redirect:/workbook");
  });
});

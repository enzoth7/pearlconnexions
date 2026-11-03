import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateManagerCredentials } from "./actions";
import { requireTeamAdmin } from "@/workbook/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

vi.mock("@/workbook/lib/data", () => ({ requireTeamAdmin: vi.fn(), requireDirector: vi.fn(), requireEditor: vi.fn(), isMissingTeamHierarchyColumn: vi.fn(() => false) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const managerId = "11111111-1111-4111-8111-111111111111";
const linkedProfile = { id: "22222222-2222-4222-8222-222222222222", role: "manager", manager_id: managerId };
const managerUpdate = vi.fn();
const profileUpdate = vi.fn();
const updateAuthUser = vi.fn();
const profileLookup = vi.fn();
const supabase = {
  from: (table: string) => table === "managers" ? {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: managerId, parent_manager_id: null }, error: null }) }) }),
    update: (values: unknown) => { managerUpdate(values); return { eq: async () => ({ error: null }) }; },
  } : {
    select: () => ({ eq: () => ({ maybeSingle: profileLookup }) }),
  },
};

function nameEdit() {
  const data = new FormData();
  data.set("manager_id", managerId);
  data.set("name", "Changed name");
  return data;
}

describe("manager name changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileLookup.mockResolvedValue({ data: linkedProfile, error: null });
    updateAuthUser.mockResolvedValue({ error: null });
    vi.mocked(requireTeamAdmin).mockResolvedValue({
      supabase, isDirector: true, managerId: null,
      profile: { id: "director-user", manager_id: null },
    } as unknown as Awaited<ReturnType<typeof requireTeamAdmin>>);
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({ update: (values: unknown) => { profileUpdate(values); return { eq: async () => ({ error: null }) }; } }),
      auth: { admin: { updateUserById: updateAuthUser } },
    } as unknown as NonNullable<ReturnType<typeof createAdminClient>>);
  });

  it("updates the manager and linked display name without touching credentials or permissions", async () => {
    expect(await updateManagerCredentials(nameEdit())).toEqual({ ok: true });
    expect(managerUpdate).toHaveBeenCalledWith({ name: "Changed name" });
    expect(profileUpdate).toHaveBeenCalledWith({ display_name: "Changed name" });
    expect(updateAuthUser).not.toHaveBeenCalled();
  });

  it("only changes login details when they are explicitly submitted", async () => {
    const data = nameEdit();
    data.set("email", "changed@example.com");
    expect(await updateManagerCredentials(data)).toEqual({ ok: true });
    expect(updateAuthUser).toHaveBeenCalledWith(linkedProfile.id, {
      email: "changed@example.com", email_confirm: true, user_metadata: { display_name: "Changed name" },
    });
  });

  it("reports a profile lookup failure instead of silently claiming the name was saved everywhere", async () => {
    profileLookup.mockResolvedValue({ data: null, error: { message: "Profile lookup unavailable" } });
    expect(await updateManagerCredentials(nameEdit())).toEqual({ ok: false, message: "Profile lookup unavailable" });
    expect(profileUpdate).not.toHaveBeenCalled();
    expect(updateAuthUser).not.toHaveBeenCalled();
  });

  it("does not allow a manager to rename an unrelated employee", async () => {
    vi.mocked(requireTeamAdmin).mockResolvedValue({
      supabase, isDirector: false, managerId: "other-manager", canManageEmployees: false, canManageLogins: false,
      profile: { id: "actor", manager_id: "other-manager" },
    } as unknown as Awaited<ReturnType<typeof requireTeamAdmin>>);
    expect((await updateManagerCredentials(nameEdit())).ok).toBe(false);
    expect(managerUpdate).not.toHaveBeenCalled();
    expect(profileUpdate).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireAuth,
  requireDirector,
  getActions,
  getActionById,
  getManagers,
  getManagersWithProfiles,
} from "./data";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("data layer auth and role functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireAuth redirects to /login when unauthenticated", async () => {
    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("requireAuth redirects to /access-pending when role is pending", async () => {
    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "user-1", display_name: "Pending User", role: "pending", manager_id: null },
            }),
          }),
        }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/access-pending");
  });

  it("requireAuth returns context for director", async () => {
    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "dir-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "dir-1", display_name: "Director User", role: "director", manager_id: null },
            }),
          }),
        }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const ctx = await requireAuth();
    expect(ctx.isDirector).toBe(true);
    expect(ctx.isManager).toBe(false);
    expect(ctx.managerId).toBeNull();
  });

  it("requireDirector redirects when user is a manager", async () => {
    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "mgr-user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "mgr-user-1", display_name: "Manager User", role: "manager", manager_id: "mgr-1" },
            }),
          }),
        }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await expect(requireDirector()).rejects.toThrow("REDIRECT:/access-pending");
  });

  it("getActions automatically scopes to manager's actions", async () => {
    const actionsData = [
      {
        id: "act-1",
        reference: "BD01",
        title: "Action 1",
        participants: [{ manager: { id: "mgr-1" } }],
      },
      {
        id: "act-2",
        reference: "BD02",
        title: "Action 2",
        participants: [{ manager: { id: "mgr-2" } }],
      },
    ];

    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "mgr-user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "mgr-user-1", display_name: "Manager User", role: "manager", manager_id: "mgr-1" },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: actionsData, error: null }),
          }),
        };
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const actions = await getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe("act-1");
  });

  it("getActionById verifies manager participation", async () => {
    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "mgr-user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "mgr-user-1", display_name: "Manager User", role: "manager", manager_id: "mgr-1" },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "act-99",
                  participants: [{ manager: { id: "mgr-other" } }],
                },
                error: null,
              }),
            }),
          }),
        };
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const action = await getActionById("act-99");
    expect(action).toBeNull();
  });

  it("getManagersWithProfiles merges managers and linked profiles correctly", async () => {
    const managersList = [
      { id: "mgr-1", name: "Alice", role_title: "Head of Care", email: "alice@example.com" },
      { id: "mgr-2", name: "Bob", role_title: "Lead Nurse", email: null },
    ];
    const profilesList = [
      { id: "prof-1", display_name: "Alice Profile", role: "manager", manager_id: "mgr-1" },
      { id: "prof-dir", display_name: "Joel Samuel", role: "director", manager_id: null },
    ];

    const mockSupabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "dir-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn((cols: string) => {
              if (cols === "id, display_name, role, manager_id") {
                return {
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: "dir-1", display_name: "Joel", role: "director", manager_id: null },
                    }),
                  }),
                  then: (resolve: any) => resolve({ data: profilesList, error: null }),
                };
              }
              return {
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "dir-1", display_name: "Joel", role: "director", manager_id: null },
                  }),
                }),
              };
            }),
          };
        }
        if (table === "managers") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: managersList, error: null }),
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const result = await getManagersWithProfiles();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[0].profile).toEqual({
      id: "prof-1",
      display_name: "Alice Profile",
      role: "manager",
    });
    expect(result[1].name).toBe("Bob");
    expect(result[1].profile).toBeNull();
  });
});

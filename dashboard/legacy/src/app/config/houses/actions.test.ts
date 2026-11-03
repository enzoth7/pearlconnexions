import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { saveHouse } from "./actions";

vi.mock("@/lib/auth", () => ({ requireWorkspaceAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const single = vi.fn();
const selectInserted = vi.fn(() => ({ single }));
const insert = vi.fn(() => ({ select: selectInserted }));
const selectCodes = vi.fn();
const from = vi.fn(() => ({ select: selectCodes, insert }));

function houseForm(address = "10 Example Road") {
  const form = new FormData();
  form.set("name", "New house");
  form.set("address", address);
  form.set("provision", "Supported Living");
  form.set("active", "on");
  return form;
}

describe("house management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspaceAdmin).mockResolvedValue({ supabase: { from } } as unknown as Awaited<ReturnType<typeof requireWorkspaceAdmin>>);
    selectCodes.mockResolvedValue({ data: [{ code: "CH1" }, { code: "CH7" }], error: null });
    single.mockResolvedValue({ data: { id: "new-id" }, error: null });
  });

  it("requires an address when adding a house", async () => {
    expect(await saveHouse(houseForm(""))).toMatchObject({ ok: false });
    expect(from).not.toHaveBeenCalled();
  });

  it("allows only a workspace admin to create a house", async () => {
    vi.mocked(requireWorkspaceAdmin).mockRejectedValue(new Error("Forbidden"));
    await expect(saveHouse(houseForm())).rejects.toThrow("Forbidden");
    expect(from).not.toHaveBeenCalled();
  });

  it("allocates the next code and saves the address and status", async () => {
    expect(await saveHouse(houseForm())).toMatchObject({ ok: true, message: "House added." });
    expect(insert).toHaveBeenCalledWith({ code: "CH8", name: "New house", address: "10 Example Road", provision: "Supported Living", active: true });
    expect(revalidatePath).toHaveBeenCalledWith("/config/houses");
  });
});

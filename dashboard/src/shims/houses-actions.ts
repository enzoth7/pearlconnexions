"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkspaceAdmin } from "@/lib/auth";

const houseSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).refine(value => value.length === 0 || value.length >= 5),
  provision: z.enum(["Children's Home", "Supported Living", "Supported Accommodation"]),
  active: z.boolean(),
});

export async function saveHouse(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = houseSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    address: formData.get("address"),
    provision: formData.get("provision"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success || (!parsed.data.id && parsed.data.address.length < 5)) {
    return { ok: false, message: "Enter a name, address and service for the house." };
  }

  const { supabase } = await requireWorkspaceAdmin();
  const { id, ...fields } = parsed.data;
  const values = { ...fields, address: fields.address || null };
  if (id) {
    const result = await supabase.from("qa_homes").update(values).eq("id", id).select("id").maybeSingle();
    if (result.error || !result.data) return { ok: false, message: result.error?.code === "23505" ? "A house with this name already exists." : result.error?.message || "House unavailable." };
  } else {
    const existing = await supabase.from("qa_homes").select("code");
    if (existing.error) return { ok: false, message: existing.error.message };
    let nextCode = Math.max(0, ...(existing.data ?? []).map(row => Number(row.code.match(/^CH(\d+)$/)?.[1] ?? 0))) + 1;
    let created = false;
    for (let attempt = 0; attempt < 3 && !created; attempt++, nextCode++) {
      const result = await supabase.from("qa_homes").insert({ ...values, code: `CH${nextCode}` }).select("id").single();
      if (!result.error) created = true;
      else if (result.error.code === "23505" && result.error.message.includes("qa_homes_code_key")) continue;
      else return { ok: false, message: result.error.code === "23505" ? "A house with this name already exists." : result.error.message };
    }
    if (!created) return { ok: false, message: "Could not assign a house code. Please try again." };
  }

  revalidatePath("/config/houses");
  revalidatePath("/config/permissions");
  revalidatePath("/qa/homes");
  return { ok: true, message: id ? "House updated." : "House added." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isMissingTeamHierarchyColumn, requireDirector, requireTeamAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { nextActionReference } from "@/lib/utils";

const optionalDate = z.string().transform((v) => v || null).nullable();

const actionSchema = z.object({
  id: z.string().uuid(),
  workstream_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(5).max(1000),
  priority: z.enum(["High", "Medium", "Low", ""]).transform((v) => v || null),
  base_status: z.enum(["Not Started", "In Progress", "At Risk"]),
  deadline: optionalDate,
  extended_deadline: optionalDate,
  completed_at: optionalDate,
  owner_manager_ids: z.array(z.string().uuid()).default([]),
  support_manager_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

const createActionSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(1000),
  workstream_id: z.string().uuid("Please select a workstream"),
  priority: z.enum(["High", "Medium", "Low", ""]).transform((v) => v || null),
  deadline: optionalDate,
  owner_manager_ids: z.array(z.string().uuid()).default([]),
  support_manager_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  responsibility_type: z
    .enum(["Owner", "Joint owner", "Collective SMT owner", "Support"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  responsibility_text: z.string().trim().optional(),
});

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string[]> };

function actionFormValues(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    owner_manager_ids: formData.getAll("owner_manager_ids"),
  };
}

export async function createAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = createActionSchema.safeParse(actionFormValues(formData));
  if (!parsed.success) {
    return { message: "Check the highlighted fields.", errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { supabase } = await requireDirector();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const [{ data: workstream, error: workstreamError }, { data: existingActions, error: referencesError }] =
    await Promise.all([
      supabase.from("workstreams").select("name").eq("id", parsed.data.workstream_id).single(),
      supabase.from("actions").select("reference, workstream_id"),
    ]);

  if (workstreamError || !workstream) return { message: workstreamError?.message || "Workstream not found." };
  if (referencesError) return { message: referencesError.message };

  const allReferences = (existingActions ?? []).map((action) => action.reference);
  const workstreamReferences = (existingActions ?? [])
    .filter((action) => action.workstream_id === parsed.data.workstream_id)
    .map((action) => action.reference);
  let newAction: { id: string; reference: string } | null = null;
  let generatedReference = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      generatedReference = nextActionReference(workstream.name, workstreamReferences, allReferences);
    } catch (error) {
      return { message: error instanceof Error ? error.message : "Could not generate a reference." };
    }

    const { data, error } = await supabase
      .from("actions")
      .insert({
        reference: generatedReference,
        title: parsed.data.title,
        workstream_id: parsed.data.workstream_id,
        priority: parsed.data.priority,
        base_status: "Not Started",
        date_added: today,
        deadline: parsed.data.deadline,
      })
      .select("id, reference")
      .single();

    if (!error && data) {
      newAction = data;
      break;
    }
    if (error?.code !== "23505") return { message: error?.message || "Could not create the action." };
    allReferences.push(generatedReference);
  }

  if (!newAction) return { message: "The reference was taken by another action. Please try again." };

  const ownerIds = [...new Set(parsed.data.owner_manager_ids)];
  const ownerType = ownerIds.length > 1 ? "Joint owner" : (parsed.data.responsibility_type ?? "Owner");
  const ownerText = parsed.data.responsibility_text?.trim() || (ownerIds.length > 1 ? "Jointly lead delivery" : "Lead delivery");
  const participants = ownerIds.map((managerId, index) => ({
    action_id: newAction.id,
    manager_id: managerId,
    responsibility_type: ownerType,
    responsibility_text: ownerText,
    source_workbook: "dashboard",
    source_row: index + 1,
  }));

  if (parsed.data.support_manager_id && !ownerIds.includes(parsed.data.support_manager_id)) {
    participants.push({
      action_id: newAction.id,
      manager_id: parsed.data.support_manager_id,
      responsibility_type: "Support",
      responsibility_text: "Support lead managers",
      source_workbook: "dashboard",
      source_row: participants.length + 1,
    });
  }

  if (participants.length > 0) {
    const { error: participantError } = await supabase.from("action_participants").insert(participants);
    if (participantError) {
      await supabase.from("actions").delete().eq("id", newAction.id);
      return { message: participantError.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/actions");
  return { ok: true, message: `Action ${newAction.reference} created successfully.` };
}

export async function updateAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = actionSchema.safeParse(actionFormValues(formData));
  if (!parsed.success) return { message: "Check the highlighted fields.", errors: z.flattenError(parsed.error).fieldErrors };
  const { supabase } = await requireDirector();
  const { id, owner_manager_ids, support_manager_id, ...values } = parsed.data;
  const payload: Record<string, unknown> = { ...values };
  if (!payload.workstream_id) delete payload.workstream_id;
  const { error } = await supabase.from("actions").update(payload).eq("id", id);
  if (error) return { message: error.message };

  if (formData.has("owner_managers_present") || formData.has("support_manager_id")) {
    const { data: existingParts, error: participantsError } = await supabase
      .from("action_participants")
      .select("id, manager_id, responsibility_type")
      .eq("action_id", id);
    if (participantsError) return { message: participantsError.message };

    const desiredOwnerIds = [...new Set(owner_manager_ids)];
    const desiredOwnerType = desiredOwnerIds.length > 1 ? "Joint owner" : "Owner";
    const desiredSupportId = support_manager_id && !desiredOwnerIds.includes(support_manager_id)
      ? support_manager_id
      : undefined;
    const existingByManager = new Map((existingParts ?? []).map((participant) => [participant.manager_id, participant]));
    const desiredIds = new Set([...desiredOwnerIds, ...(desiredSupportId ? [desiredSupportId] : [])]);

    const obsoleteIds = (existingParts ?? [])
      .filter((participant) => !desiredIds.has(participant.manager_id))
      .map((participant) => participant.id);
    if (obsoleteIds.length > 0) {
      const { error: deleteError } = await supabase.from("action_participants").delete().in("id", obsoleteIds);
      if (deleteError) return { message: deleteError.message };
    }

    for (const managerId of desiredOwnerIds) {
      const existing = existingByManager.get(managerId);
      if (existing) {
        if (existing.responsibility_type !== desiredOwnerType) {
          const { error: updateError } = await supabase
            .from("action_participants")
            .update({ responsibility_type: desiredOwnerType })
            .eq("id", existing.id);
          if (updateError) return { message: updateError.message };
        }
      } else {
        const { error: insertError } = await supabase.from("action_participants").insert({
          action_id: id,
          manager_id: managerId,
          responsibility_type: desiredOwnerType,
          responsibility_text: desiredOwnerIds.length > 1 ? "Jointly lead delivery" : "Lead delivery",
          source_workbook: "dashboard",
          source_row: 1,
        });
        if (insertError) return { message: insertError.message };
      }
    }

    if (desiredSupportId) {
      const existing = existingByManager.get(desiredSupportId);
      if (existing) {
        if (existing.responsibility_type !== "Support") {
          const { error: updateError } = await supabase
            .from("action_participants")
            .update({ responsibility_type: "Support" })
            .eq("id", existing.id);
          if (updateError) return { message: updateError.message };
        }
      } else {
        const { error: insertError } = await supabase.from("action_participants").insert({
          action_id: id,
          manager_id: desiredSupportId,
          responsibility_type: "Support",
          responsibility_text: "Support lead managers",
          source_workbook: "dashboard",
          source_row: desiredOwnerIds.length + 1,
        });
        if (insertError) return { message: insertError.message };
      }
    }
  }

  revalidatePath("/"); revalidatePath("/actions"); revalidatePath(`/actions/${id}`);
  return { ok: true, message: "Action saved." };
}

const participantSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  action_id: z.string().uuid("Action ID is required"),
  manager_id: z.string().uuid("Please select a manager"),
  responsibility_type: z.enum(["Owner", "Joint owner", "Collective SMT owner", "Support"]),
  responsibility_text: z.string().trim().min(1, "Responsibility description is required"),
});

export async function saveParticipant(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = participantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Check the participant fields.", errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { supabase } = await requireDirector();
  const { id, action_id, manager_id, responsibility_type, responsibility_text } = parsed.data;

  if (id) {
    const { error } = await supabase
      .from("action_participants")
      .update({
        manager_id,
        responsibility_type,
        responsibility_text,
      })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return { message: "This manager is already assigned to this action." };
      }
      return { message: error.message };
    }
  } else {
    const { error } = await supabase.from("action_participants").insert({
      action_id,
      manager_id,
      responsibility_type,
      responsibility_text,
      source_workbook: "dashboard",
      source_row: 1,
    });
    if (error) {
      if (error.code === "23505") {
        return { message: "This manager is already assigned to this action." };
      }
      return { message: error.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/actions");
  revalidatePath(`/actions/${action_id}`);
  return { ok: true, message: id ? "Participant updated." : "Participant added." };
}

export async function removeParticipant(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const actionId = formData.get("action_id") ? z.string().uuid().parse(formData.get("action_id")) : null;
  const { supabase } = await requireDirector();
  const { error } = await supabase.from("action_participants").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/actions");
  if (actionId) revalidatePath(`/actions/${actionId}`);
}

const updateSchema = z.object({
  action_id: z.string().uuid(),
  review_date: z.string().min(1),
  comments: z.string().trim().max(4000).optional(),
  barriers: z.string().trim().max(4000).optional(),
  next_review_at: optionalDate,
  outcome: z.string().trim().max(4000).optional(),
  evidence: z.string().trim().max(4000).optional(),
  lessons_learned: z.string().trim().max(4000).optional(),
  follow_up: z.string().trim().max(4000).optional(),
  directors_comments: z.string().trim().max(4000).optional(),
});

export async function addUpdate(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Add a review date and check the form.", errors: z.flattenError(parsed.error).fieldErrors };
  const { supabase } = await requireDirector();
  const payload = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]));
  const { error } = await supabase.from("action_updates").insert(payload);
  if (error) return { message: error.message };
  revalidatePath("/"); revalidatePath("/reviews"); revalidatePath(`/actions/${parsed.data.action_id}`);
  return { ok: true, message: "Review entry added." };
}

const updateReviewSchema = z.object({
  id: z.string().uuid(),
  action_id: z.string().uuid(),
  review_date: z.string().min(1),
  comments: z.string().trim().max(4000).optional(),
  barriers: z.string().trim().max(4000).optional(),
  next_review_at: optionalDate,
  outcome: z.string().trim().max(4000).optional(),
  evidence: z.string().trim().max(4000).optional(),
  lessons_learned: z.string().trim().max(4000).optional(),
  follow_up: z.string().trim().max(4000).optional(),
  directors_comments: z.string().trim().max(4000).optional(),
});

export async function updateReview(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Add a review date and check the form.", errors: z.flattenError(parsed.error).fieldErrors };
  const { supabase } = await requireDirector();
  const { id, action_id, ...values } = parsed.data;
  const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]));
  const { error } = await supabase.from("action_updates").update(payload).eq("id", id);
  if (error) return { message: error.message };
  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath(`/actions/${action_id}`);
  return { ok: true, message: "Review entry updated." };
}

export async function deleteReview(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const actionId = formData.get("action_id") ? z.string().uuid().parse(formData.get("action_id")) : null;
  const { supabase } = await requireDirector();
  const { error } = await supabase.from("action_updates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/reviews");
  if (actionId) revalidatePath(`/actions/${actionId}`);
}

export async function signOffAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const id = z.string().uuid().parse(formData.get("action_id"));
    const signerName = formData.get("signed_off_by_name")?.toString().trim();
    const customCompletedAt = formData.get("completed_at")?.toString().trim();
    const { supabase, profile } = await requireDirector();
    const finalSigner = signerName || profile.display_name || "Joel Samuel";

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
    const completedDate = customCompletedAt || today;
    await supabase.from("actions").update({ completed_at: completedDate }).eq("id", id);

    const { data: existingSignoff } = await supabase
      .from("action_signoffs")
      .select("id")
      .eq("action_id", id)
      .maybeSingle();

    if (existingSignoff) {
      const { error: rpcErr } = await supabase.rpc("sign_off_action", {
        action_uuid: id,
        signer_name: finalSigner,
      });

      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from("action_signoffs")
          .update({
            signed_off_by_name: finalSigner,
            signed_off_at: new Date().toISOString(),
          })
          .eq("action_id", id);

        if (updateErr) {
          return { ok: false, message: updateErr.message || rpcErr.message };
        }
      }
    } else {
      const { error: rpcErr } = await supabase.rpc("sign_off_action", {
        action_uuid: id,
        signer_name: finalSigner,
      });

      if (rpcErr) {
        const { error: insertErr } = await supabase.from("action_signoffs").insert({
          action_id: id,
          signed_off_by_name: finalSigner,
        });
        if (insertErr) {
          return { ok: false, message: insertErr.message || rpcErr.message };
        }
      }
    }

    revalidatePath("/");
    revalidatePath("/actions");
    revalidatePath("/archive");
    revalidatePath(`/actions/${id}`);
    return { ok: true, message: "Action signed off successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to sign off action";
    return { ok: false, message: msg };
  }
}

export async function deleteAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  try {
    const id = z.string().uuid().parse(formData.get("id"));
    const { supabase } = await requireDirector();
    const { error } = await supabase.from("actions").delete().eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/");
    revalidatePath("/actions");
    revalidatePath("/archive");
    revalidatePath("/reviews");
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete action";
    return { ok: false, message: msg };
  }
}

export async function createManager(formData: FormData): Promise<{ ok: boolean; message?: string; managerId?: string }> {
  try {
    const auth = await requireTeamAdmin();
    const { supabase } = auth;
    const admin = createAdminClient();
    if (!admin) {
      return {
        ok: false,
        message: "Manager administration is not configured. Add SUPABASE_SECRET_KEY to the server environment.",
      };
    }
    const name = z.string().trim().min(2).parse(formData.get("name"));
    const roleTitle = formData.get("role_title")?.toString().trim() || null;
    const email = formData.get("email")?.toString().trim() || null;
    const password = formData.get("password")?.toString().trim() || null;
    const requestedSystemRole = formData.get("system_role")?.toString().trim();
    const systemRole = auth.isDirector && requestedSystemRole === "director" ? "director" : "manager";
    const avatarColor = formData.get("avatar_color")?.toString().trim();
    const requestedParentId = formData.get("parent_manager_id")?.toString().trim() || null;
    const parentManagerId = systemRole === "director"
      ? null
      : auth.isDirector
      ? requestedParentId
      : auth.managerId;

    if (!auth.isDirector && !parentManagerId) {
      return { ok: false, message: "Your login is not linked to a manager profile." };
    }

    if (parentManagerId) {
      const { data: parent, error: parentError } = await supabase
        .from("managers")
        .select("id")
        .eq("id", parentManagerId)
        .maybeSingle();
      if (parentError || !parent) {
        return { ok: false, message: parentError?.message || "The selected manager is not available." };
      }
    }

    const initials = name
      .split(" ")
      .map((w) => w[0]?.toUpperCase())
      .filter(Boolean)
      .join("")
      .slice(0, 4) || "MGR";
    const sourceCode = `${initials}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let insertResult = await admin
      .from("managers")
      .insert({
        name,
        role_title: roleTitle,
        email,
        source_code: sourceCode,
        parent_manager_id: parentManagerId,
        can_manage_employees: false,
      })
      .select("id")
      .single();

    if (isMissingTeamHierarchyColumn(insertResult.error)) {
      insertResult = await admin
        .from("managers")
        .insert({
          name,
          role_title: roleTitle,
          email,
          source_code: sourceCode,
        })
        .select("id")
        .single();
    }

    const { data: newManager, error: insertErr } = insertResult;

    if (insertErr) return { ok: false, message: insertErr.message };

    if (email && password) {
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: name,
          ...(avatarColor ? { avatar_color: avatarColor } : {}),
        },
      });
      if (authErr) {
        await admin.from("managers").delete().eq("id", newManager.id);
        return { ok: false, message: `Auth error: ${authErr.message}` };
      }

      const { error: profileErr } = await admin
        .from("profiles")
        .update({ role: systemRole, manager_id: newManager.id, display_name: name })
        .eq("id", authData.user.id);

      if (profileErr) {
        await admin.auth.admin.deleteUser(authData.user.id);
        await admin.from("managers").delete().eq("id", newManager.id);
        return { ok: false, message: `Could not assign manager access: ${profileErr.message}` };
      }
    }

    revalidatePath("/settings");
    revalidatePath("/actions");
    return { ok: true, managerId: newManager.id };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to create manager" };
  }
}

export async function updateManagerCredentials(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  try {
    const auth = await requireTeamAdmin();
    const { supabase, profile: currentProfile } = auth;
    const managerId = z.string().uuid().parse(formData.get("manager_id"));
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString().trim();
    const roleTitle = formData.get("role_title")?.toString().trim();
    const name = formData.get("name")?.toString().trim();
    const systemRole = formData.get("system_role")?.toString().trim();
    const avatarColor = formData.get("avatar_color")?.toString().trim();
    const requestedParentId = formData.get("parent_manager_id")?.toString().trim() || null;

    let hierarchyReady = true;
    let targetResult = await supabase
      .from("managers")
      .select("id, parent_manager_id")
      .eq("id", managerId)
      .maybeSingle();
    if (isMissingTeamHierarchyColumn(targetResult.error)) {
      hierarchyReady = false;
      targetResult = await supabase
        .from("managers")
        .select("id")
        .eq("id", managerId)
        .maybeSingle();
    }
    const { data: targetManager, error: targetError } = targetResult;
    if (targetError || !targetManager) {
      return { ok: false, message: targetError?.message || "This team member is not available." };
    }

    if (
      !auth.isDirector &&
      (!hierarchyReady ||
        (targetManager as { parent_manager_id?: string | null }).parent_manager_id !== auth.managerId)
    ) {
      return { ok: false, message: "You can only manage employees who report directly to you." };
    }

    if (auth.isDirector && requestedParentId === managerId) {
      return { ok: false, message: "A team member cannot report to themselves." };
    }

    const managerUpdate: Record<string, unknown> = {};
    if (name) managerUpdate.name = name;
    if (roleTitle !== undefined) managerUpdate.role_title = roleTitle || null;
    if (email !== undefined) managerUpdate.email = email || null;
    if (hierarchyReady && auth.isDirector && systemRole === "director") {
      managerUpdate.parent_manager_id = null;
    } else if (hierarchyReady && auth.isDirector && formData.has("parent_manager_id")) {
      managerUpdate.parent_manager_id = requestedParentId;
    }

    if (Object.keys(managerUpdate).length > 0) {
      const { error: mgrErr } = await supabase.from("managers").update(managerUpdate).eq("id", managerId);
      if (mgrErr) return { ok: false, message: mgrErr.message };
    }

    const { data: linkedProfile } = await supabase
      .from("profiles")
      .select("id, role, manager_id")
      .eq("manager_id", managerId)
      .maybeSingle();

    if (linkedProfile) {
      if ((auth.isDirector && (systemRole === "director" || systemRole === "manager")) || name) {
        if (linkedProfile.id === currentProfile.id && systemRole && systemRole !== "director") {
          return { ok: false, message: "You cannot remove your own admin director role." };
        }
        const profileUpdate: Record<string, unknown> = {};
        if (auth.isDirector && (systemRole === "director" || systemRole === "manager")) {
          profileUpdate.role = systemRole;
        }
        if (name) profileUpdate.display_name = name;
        if (Object.keys(profileUpdate).length > 0) {
          const admin = createAdminClient();
          if (!admin) {
            return { ok: false, message: "Manager login is not configured. Add SUPABASE_SECRET_KEY to the server environment." };
          }
          const { error: profErr } = await admin.from("profiles").update(profileUpdate).eq("id", linkedProfile.id);
          if (profErr) return { ok: false, message: profErr.message };
        }
      }

      if (email || password || avatarColor) {
        const admin = createAdminClient();
        if (!admin) {
          return {
            ok: false,
            message: "Manager login is not configured. Add SUPABASE_SECRET_KEY to the server environment.",
          };
        }

        const metadataUpdate: Record<string, unknown> = {};
        if (name) metadataUpdate.display_name = name;
        if (avatarColor) metadataUpdate.avatar_color = avatarColor;

        const { error: authErr } = await admin.auth.admin.updateUserById(linkedProfile.id, {
          ...(email ? { email, email_confirm: true } : {}),
          ...(password ? { password } : {}),
          ...(Object.keys(metadataUpdate).length > 0 ? { user_metadata: metadataUpdate } : {}),
        });
        if (authErr) return { ok: false, message: `Auth error: ${authErr.message}` };
      }
    } else if (email && password) {
      const admin = createAdminClient();
      if (!admin) {
        return {
          ok: false,
          message: "Manager login is not configured. Add SUPABASE_SECRET_KEY to the server environment.",
        };
      }

      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: name || "Manager",
          ...(avatarColor ? { avatar_color: avatarColor } : {}),
        },
      });
      if (authErr) return { ok: false, message: `Auth error: ${authErr.message}` };

      const newRole = auth.isDirector && systemRole === "director" ? "director" : "manager";
      const { error: profileErr } = await admin
        .from("profiles")
        .update({ role: newRole, manager_id: managerId, display_name: name || "Manager" })
        .eq("id", authData.user.id);

      if (profileErr) {
        await admin.auth.admin.deleteUser(authData.user.id);
        return { ok: false, message: `Could not assign manager access: ${profileErr.message}` };
      }
    }

    revalidatePath("/settings");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to update manager credentials" };
  }
}

export async function deleteManager(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  try {
    const auth = await requireTeamAdmin();
    const { supabase, profile: currentProfile } = auth;
    const managerId = z.string().uuid().parse(formData.get("manager_id"));

    if (currentProfile.manager_id === managerId) {
      return { ok: false, message: "You cannot delete your own logged-in director account." };
    }

    let hierarchyReady = true;
    let targetResult = await supabase
      .from("managers")
      .select("id, parent_manager_id")
      .eq("id", managerId)
      .maybeSingle();
    if (isMissingTeamHierarchyColumn(targetResult.error)) {
      hierarchyReady = false;
      targetResult = await supabase
        .from("managers")
        .select("id")
        .eq("id", managerId)
        .maybeSingle();
    }
    const { data: targetManager, error: targetError } = targetResult;
    if (targetError || !targetManager) {
      return { ok: false, message: targetError?.message || "This team member is not available." };
    }
    if (
      !auth.isDirector &&
      (!hierarchyReady ||
        (targetManager as { parent_manager_id?: string | null }).parent_manager_id !== auth.managerId)
    ) {
      return { ok: false, message: "You can only delete employees who report directly to you." };
    }

    if (hierarchyReady) {
      const { count: directReportCount, error: reportsError } = await supabase
        .from("managers")
        .select("id", { count: "exact", head: true })
        .eq("parent_manager_id", managerId);
      if (reportsError) return { ok: false, message: reportsError.message };
      if ((directReportCount ?? 0) > 0) {
        return { ok: false, message: "Reassign this manager's employees before deleting them." };
      }
    }

    const admin = createAdminClient();
    if (!admin) {
      return { ok: false, message: "Manager login is not configured. Add SUPABASE_SECRET_KEY to the server environment." };
    }
    const { error: profileError } = await admin
      .from("profiles")
      .update({ manager_id: null, role: "pending" })
      .eq("manager_id", managerId);
    if (profileError) return { ok: false, message: profileError.message };

    const { error } = await supabase.from("managers").delete().eq("id", managerId);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/settings");
    revalidatePath("/actions");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to delete manager" };
  }
}

export async function setManagerEmployeePermission(
  formData: FormData
): Promise<{ ok: boolean; message?: string }> {
  try {
    const { supabase } = await requireDirector();
    const managerId = z.string().uuid().parse(formData.get("manager_id"));
    const enabled = z.enum(["true", "false"]).parse(formData.get("enabled")) === "true";

    const { data: linkedProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("manager_id", managerId)
      .maybeSingle();
    if (profileError) return { ok: false, message: profileError.message };
    if (linkedProfile?.role === "director") {
      return { ok: false, message: "Directors already have full team access." };
    }

    const { error } = await supabase
      .from("managers")
      .update({ can_manage_employees: enabled })
      .eq("id", managerId);
    if (isMissingTeamHierarchyColumn(error)) {
      return {
        ok: false,
        message: "Team hierarchy is not active yet. Apply the pending database migration first.",
      };
    }
    if (error) return { ok: false, message: error.message };

    revalidatePath("/settings");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to update team access" };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

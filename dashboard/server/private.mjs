import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publicKey || !secret) throw new Error("Supabase credentials are missing from the server environment.");
const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const authClient = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
const id = z.uuid();
const email = z.email();
const text = (max = 120) => z.string().trim().max(max);
const required = (max = 120) => text(max).min(2);
const success = (message, extra = {}) => ({ ok: true, message, ...extra });
const fail = (message) => ({ ok: false, message });

async function actorFrom(request) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const verified = await authClient.auth.getUser(token);
  if (verified.error || !verified.data.user) return null;
  const userId = verified.data.user.id;
  const { data: profile, error } = await admin.from("profiles").select("id,role,manager_id").eq("id", userId).maybeSingle();
  if (error || !profile || !["director", "manager"].includes(profile.role)) return null;
  const { data: manager } = profile.manager_id ? await admin.from("managers").select("can_manage_employees,can_manage_logins").eq("id", profile.manager_id).maybeSingle() : { data: null };
  const { data: access } = await admin.from("workspace_access").select("is_admin").eq("user_id", userId).maybeSingle();
  return { id: userId, role: profile.role, managerId: profile.manager_id, isAdmin: Boolean(access?.is_admin), canManageEmployees: Boolean(manager?.can_manage_employees), canManageLogins: Boolean(manager?.can_manage_logins) };
}

async function linkedProfile(managerId) {
  const result = await admin.from("profiles").select("id,role,manager_id").eq("manager_id", managerId).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

async function createManager(actor, fields) {
  if (!actor.canManageEmployees && actor.role !== "director") return fail("You do not have permission to add employees.");
  if (actor.role !== "director" && !actor.managerId) return fail("Your login is not linked to a manager profile.");
  const parsed = z.object({ name: required(), role_title: text(120).optional().default(""), email: z.union([email, z.literal("")]).optional().default(""), password: text(200).optional().default(""), system_role: z.enum(["director", "manager"]).optional().default("manager"), parent_manager_id: z.union([id, z.literal("")]).optional().default("") }).safeParse(fields);
  if (!parsed.success) return fail("Check the employee details.");
  const data = parsed.data;
  if (actor.role !== "director" && (data.email || data.password) && !actor.canManageLogins) return fail("You do not have permission to create employee logins.");
  if (Boolean(data.email) !== Boolean(data.password)) return fail("Enter both an email and password to create a login.");
  if (data.password && data.password.length < 8) return fail("Use a password with at least eight characters.");
  const parentId = actor.role === "director" ? data.system_role === "director" ? null : data.parent_manager_id || null : actor.managerId;
  if (parentId) {
    const parent = await admin.from("managers").select("id").eq("id", parentId).maybeSingle();
    if (parent.error || !parent.data) return fail("The selected manager is not available.");
  }
  const sourceCode = `${data.name.split(/\s+/).map(word => word[0]?.toUpperCase()).join("").slice(0, 4) || "MGR"}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const inserted = await admin.from("managers").insert({ name: data.name, role_title: data.role_title || null, email: data.email || null, source_code: sourceCode, parent_manager_id: parentId, can_manage_employees: false, can_manage_logins: false, can_add_actions: false, can_edit_actions: false, can_delete_actions: false, can_reassign_actions: false, can_sign_off_actions: false }).select("id").single();
  if (inserted.error) return fail(inserted.error.message);
  if (data.email) {
    const created = await admin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { display_name: data.name } });
    if (created.error || !created.data.user) { await admin.from("managers").delete().eq("id", inserted.data.id); return fail(created.error?.message || "Could not create login."); }
    const profile = await admin.from("profiles").update({ display_name: data.name, role: actor.role === "director" ? data.system_role : "manager", manager_id: inserted.data.id }).eq("id", created.data.user.id);
    const access = profile.error ? null : await admin.from("workspace_access").upsert({ user_id: created.data.user.id, workbook: false, qa: false, finance: false, hr: false, maintenance: false, can_manage_maintenance: false, visible_sections: [] });
    if (profile.error || access?.error) { await admin.auth.admin.deleteUser(created.data.user.id); await admin.from("managers").delete().eq("id", inserted.data.id); return fail(profile.error?.message || access?.error?.message || "Could not assign access."); }
  }
  return success("Employee added.", { managerId: inserted.data.id });
}

async function assertTarget(actor, managerId, allowSelf = false) {
  const target = await admin.from("managers").select("id,parent_manager_id").eq("id", managerId).maybeSingle();
  if (target.error || !target.data) return null;
  if (actor.role === "director") return target.data;
  if (allowSelf && actor.managerId === managerId) return target.data;
  if ((actor.canManageEmployees || actor.canManageLogins) && actor.managerId && target.data.parent_manager_id === actor.managerId) return target.data;
  return null;
}

async function updateManager(actor, fields) {
  const managerId = id.safeParse(fields.manager_id);
  if (!managerId.success) return fail("Invalid employee.");
  const target = await assertTarget(actor, managerId.data, true);
  if (!target) return fail("You can only manage your own account or direct employees.");
  const self = actor.managerId === managerId.data;
  const canDetails = actor.role === "director" || self || actor.canManageEmployees;
  const canLogin = actor.role === "director" || self || actor.canManageLogins;
  const update = {};
  if (canDetails && fields.name !== undefined) { const result = required().safeParse(fields.name); if (!result.success) return fail("Enter a valid name."); update.name = result.data; }
  if (canDetails && fields.role_title !== undefined) update.role_title = text(120).parse(fields.role_title) || null;
  if (canLogin && fields.email !== undefined) { const result = z.union([email, z.literal("")]).safeParse(fields.email); if (!result.success) return fail("Enter a valid email address."); update.email = result.data || null; }
  if (actor.role === "director" && fields.parent_manager_id !== undefined) {
    const parent = fields.parent_manager_id || null;
    if (parent === managerId.data) return fail("A team member cannot report to themselves.");
    if (parent && !id.safeParse(parent).success) return fail("Invalid reporting manager.");
    let current = parent;
    const visited = new Set();
    while (current) {
      if (current === managerId.data || visited.has(current)) return fail("This reporting line would create a cycle.");
      visited.add(current);
      const row = await admin.from("managers").select("parent_manager_id").eq("id", current).maybeSingle();
      if (row.error || !row.data) return fail("The selected reporting manager is unavailable.");
      current = row.data.parent_manager_id;
    }
    update.parent_manager_id = parent;
  }
  const profile = await linkedProfile(managerId.data);
  if (profile?.id === actor.id && fields.system_role && fields.system_role !== "director") return fail("You cannot remove your own director role.");
  if (Object.keys(update).length) {
    const result = await admin.from("managers").update(update).eq("id", managerId.data);
    if (result.error) return fail(result.error.message);
  }
  if (profile) {
    const profileUpdate = {};
    if (canDetails && update.name) profileUpdate.display_name = update.name;
    if (actor.role === "director" && ["director", "manager"].includes(fields.system_role)) profileUpdate.role = fields.system_role;
    if (Object.keys(profileUpdate).length) { const result = await admin.from("profiles").update(profileUpdate).eq("id", profile.id); if (result.error) return fail(result.error.message); }
    if (canLogin && (fields.email || fields.password || fields.avatar_color)) {
      const changes = {};
      if (fields.email) changes.email = email.parse(fields.email);
      if (fields.password) { if (fields.password.length < 8) return fail("Use a password with at least eight characters."); changes.password = fields.password; }
      if (fields.name || fields.avatar_color) changes.user_metadata = { ...(fields.name ? { display_name: fields.name } : {}), ...(fields.avatar_color ? { avatar_color: fields.avatar_color } : {}) };
      const result = await admin.auth.admin.updateUserById(profile.id, changes);
      if (result.error) return fail(result.error.message);
    }
  } else if (canLogin && fields.email && fields.password) {
    if (fields.password.length < 8) return fail("Use a password with at least eight characters.");
    const created = await admin.auth.admin.createUser({ email: email.parse(fields.email), password: fields.password, email_confirm: true, user_metadata: { display_name: fields.name || "Manager" } });
    if (created.error || !created.data.user) return fail(created.error?.message || "Could not create login.");
    const linked = await admin.from("profiles").update({ display_name: fields.name || "Manager", role: actor.role === "director" && fields.system_role === "director" ? "director" : "manager", manager_id: managerId.data }).eq("id", created.data.user.id);
    const access = linked.error ? null : await admin.from("workspace_access").upsert({ user_id: created.data.user.id, workbook: false, qa: false, finance: false, hr: false, maintenance: false, can_manage_maintenance: false, visible_sections: [] });
    if (linked.error || access?.error) { await admin.auth.admin.deleteUser(created.data.user.id); return fail(linked.error?.message || access?.error?.message || "Could not assign access."); }
  }
  return success("User saved.");
}

async function deleteManager(actor, fields) {
  const managerId = id.safeParse(fields.manager_id);
  if (!managerId.success || managerId.data === actor.managerId || !(actor.role === "director" || actor.canManageEmployees)) return fail("You cannot delete this employee.");
  if (!await assertTarget(actor, managerId.data)) return fail("You can only delete direct employees.");
  const children = await admin.from("managers").select("id", { count: "exact", head: true }).eq("parent_manager_id", managerId.data);
  if (children.error || (children.count ?? 0) > 0) return fail(children.error?.message || "Reassign this manager's employees first.");
  const prior = await linkedProfile(managerId.data);
  const detached = await admin.from("profiles").update({ manager_id: null, role: "pending" }).eq("manager_id", managerId.data);
  if (detached.error) return fail(detached.error.message);
  if (prior) {
    const revoked = await admin.from("workspace_access").upsert({ user_id: prior.id, workbook: false, qa: false, finance: false, hr: false, maintenance: false, can_manage_maintenance: false, visible_sections: [], is_admin: false });
    if (revoked.error) return fail(revoked.error.message);
  }
  const result = await admin.from("managers").delete().eq("id", managerId.data);
  return result.error ? fail(result.error.message) : success("Employee deleted.");
}

async function saveQaAccount(actor, fields) {
  if (actor.role !== "director" || !actor.isAdmin) return fail("Workspace administrator access required.");
  const memberId = id.safeParse(fields.member_id);
  const name = required().safeParse(fields.display_name);
  const address = email.safeParse(fields.email);
  if (!memberId.success || !name.success || !address.success || (fields.password && fields.password.length < 8)) return fail("Check the name, email and password.");
  const member = await admin.from("qa_members").select("id,user_id,email").eq("id", memberId.data).maybeSingle();
  if (member.error || !member.data?.user_id) return fail("This House Lead account is unavailable.");
  const profile = await admin.from("profiles").select("role").eq("id", member.data.user_id).maybeSingle();
  if (profile.error || ["director", "manager"].includes(profile.data?.role)) return fail("Edit this person's linked manager account instead.");
  const authUpdate = {};
  if (address.data.toLowerCase() !== member.data.email?.toLowerCase()) authUpdate.email = address.data;
  if (fields.password) authUpdate.password = fields.password;
  if (Object.keys(authUpdate).length) { const result = await admin.auth.admin.updateUserById(member.data.user_id, { ...authUpdate, email_confirm: true }); if (result.error) return fail(result.error.message); }
  const updated = await admin.from("qa_members").update({ display_name: name.data, email: address.data }).eq("id", memberId.data);
  if (updated.error) return fail(updated.error.message);
  const named = await admin.from("profiles").update({ display_name: name.data }).eq("id", member.data.user_id);
  return named.error ? fail(named.error.message) : success("User saved.");
}

async function inviteMember(actor, fields, origin) {
  if (actor.role !== "director") return fail("Director access required.");
  const parsed = z.object({ email, display_name: required(), home_ids: z.array(id).min(1) }).safeParse(fields);
  if (!parsed.success) return fail("Check the invitation details.");
  const redirectTo = `${origin}/auth/confirm?next=/update-password`;
  const invited = await admin.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo, data: { display_name: parsed.data.display_name } });
  if (invited.error || !invited.data.user) return fail(invited.error?.message || "Could not invite user.");
  const member = await admin.from("qa_members").upsert({ user_id: invited.data.user.id, email: parsed.data.email, display_name: parsed.data.display_name, active: true, invited_by: actor.id }, { onConflict: "user_id" }).select("id").single();
  if (member.error) return fail(member.error.message);
  const removed = await admin.from("qa_member_homes").delete().eq("member_id", member.data.id);
  if (removed.error) return fail(removed.error.message);
  const assigned = await admin.from("qa_member_homes").insert(parsed.data.home_ids.map(homeId => ({ member_id: member.data.id, home_id: homeId, assigned_by: actor.id })));
  return assigned.error ? fail(assigned.error.message) : success("Invitation sent and homes assigned.");
}

const operations = { "create-manager": createManager, "update-manager": updateManager, "delete-manager": deleteManager, "save-qa-account": saveQaAccount, "invite-member": inviteMember };

async function parseInput(request) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (declaredLength > 1_000_000) return { error: "Request too large." };
  let input;
  try {
    if (request.body !== undefined) {
      input = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      if (Buffer.byteLength(JSON.stringify(input || null)) > 1_000_000) return { error: "Request too large." };
    } else {
      let raw = "";
      for await (const chunk of request) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 1_000_000) return { error: "Request too large." };
      }
      input = JSON.parse(raw);
    }
  } catch {
    return { error: "Invalid request." };
  }
  return { input };
}

function requestOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin) {
    try {
      const parsed = new URL(origin);
      const local = ["localhost:3000", "localhost:3002", "127.0.0.1:3000", "127.0.0.1:3002"].includes(parsed.host) && parsed.protocol === "http:";
      if (!local && (parsed.protocol !== "https:" || parsed.host !== host)) return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || (host ? `https://${host}` : null);
}

export async function handlePrivateRequest(request, response) {
  const send = (status, body) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(body)); };
  if (new URL(request.url || "/", "http://localhost").pathname !== "/api/private" || request.method !== "POST") return send(404, fail("Not found."));
  try {
    const origin = requestOrigin(request);
    if (!origin) return send(403, fail("This request must come from the workspace."));
    const actor = await actorFrom(request);
    if (!actor) return send(401, fail("Sign in again to save changes."));
    const parsed = await parseInput(request);
    if (parsed.error) return send(parsed.error === "Request too large." ? 413 : 400, fail(parsed.error));
    const { input } = parsed;
    if (!input || typeof input !== "object" || Array.isArray(input)) return send(400, fail("Invalid request."));
    const operation = operations[input.operation];
    if (!operation || typeof input.fields !== "object" || !input.fields) return send(400, fail("Invalid request."));
    const result = await operation(actor, input.fields, origin);
    return send(result.ok ? 200 : 400, result);
  } catch (error) { return send(500, fail(error instanceof Error ? error.message : "The server could not confirm this change.")); }
}

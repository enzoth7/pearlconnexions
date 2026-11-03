import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordSchema, reportBodySchema } from "@/lib/governance";
import { z } from "zod";
import { canOpenSection } from "@/lib/workspace-sections";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ ok: false, message: "Use your workspace to save changes." }, { status: 403 });
  try {
    const context = await getAccessContext();
    if (!context) return NextResponse.json({ ok: false, message: "Sign in again to save changes." }, { status: 401 });
    const input = await request.json();
    const db = await createClient();
    if (input.operation === "record") {
      const parsed = recordSchema.safeParse(input.record);
      if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0].message }, { status: 400 });
      const { id, version, ...values } = parsed.data;
      const permitted = canOpenSection(context, values.kind === "maintenance" ? "maintenance.issues" : `qa.${values.kind}`);
      if (!permitted || (context.role !== "director" && !(values.kind === "maintenance" && context.managesMaintenance) && !context.homes.some(home => home.id === values.home_id))) {
        return NextResponse.json({ ok: false, message: "This home is not assigned to you." }, { status: 403 });
      }
      const query = id ? db.from("qa_records").update({ ...values, version: (version ?? 0) + 1 }).eq("id", id).eq("version", version ?? 0)
        : db.from("qa_records").insert({ ...values, created_by: context.userId });
      const result = await query.select("id,version").maybeSingle();
      if (result.error || !result.data) return NextResponse.json({ ok: false, message: result.error?.message || "This record changed. Reload before saving." }, { status: 409 });
      return NextResponse.json({ ok: true, message: "Record saved.", ...result.data });
    }
    if (["draft", "submit", "approve", "reopen"].includes(input.operation)) {
      const parsed = z.object({ id: z.uuid(), version: z.number().int().positive(), operation: z.enum(["draft", "submit", "approve", "reopen"]), body: reportBodySchema.optional(), reason: z.string().max(4000).optional() }).safeParse(input);
      if (!parsed.success) return NextResponse.json({ ok: false, message: "Check the report fields." }, { status: 400 });
      const { id, version, operation, body, reason } = parsed.data;
      if (!canOpenSection(context, operation === "approve" || operation === "reopen" ? "qa.reviews" : "qa.monthly_reports")) return NextResponse.json({ ok: false, message: "This section is not enabled for your account." }, { status: 403 });
      const result = await db.rpc("qa_save_report", { target: id, expected_version: version, operation, content: body ?? {}, reason: reason ?? "" });
      if (result.error) return NextResponse.json({ ok: false, message: result.error.message }, { status: result.error.code === "42501" ? 403 : 409 });
      return NextResponse.json({ ok: true, message: operation === "draft" ? "Draft saved." : operation === "submit" ? "Report sent to the director." : operation === "approve" ? "Report approved." : "Report returned to the manager.", version: result.data });
    }
    if (input.operation === "home") {
      if (context.role !== "director") return NextResponse.json({ ok: false, message: "Director access required." }, { status: 403 });
      const parsed = z.object({ id: z.uuid(), name: z.string().trim().min(2).max(120), provision: z.enum(["Children's Home", "Supported Living", "Supported Accommodation"]), total_beds: z.number().int().nonnegative().nullable(), active: z.boolean() }).safeParse(input.home);
      if (!parsed.success) return NextResponse.json({ ok: false, message: "Check the home details." }, { status: 400 });
      const { id, ...values } = parsed.data;
      const result = await db.from("qa_homes").update(values).eq("id", id).select("id").maybeSingle();
      if (result.error || !result.data) return NextResponse.json({ ok: false, message: result.error?.message || "Home unavailable." }, { status: 400 });
      return NextResponse.json({ ok: true, message: "Home saved." });
    }
    return NextResponse.json({ ok: false, message: "Unknown operation." }, { status: 400 });
  } catch { return NextResponse.json({ ok: false, message: "The server could not confirm this change. Your entries have been kept." }, { status: 503 }); }
}

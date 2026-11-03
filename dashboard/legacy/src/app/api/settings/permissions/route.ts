import { NextResponse } from "next/server";
import { saveQaHomeAssignments, saveWorkspacePermissions } from "@/app/actions";
import { getAccessContext } from "@/lib/auth";
import { setManagerPermission } from "@/workbook/actions";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, message: "This request must come from your workspace." }, { status: 403 });
  }
  try {
    const context = await getAccessContext();
    if (!context) return NextResponse.json({ ok: false, message: "Your session has expired. Sign in again to save permissions." }, { status: 401 });
    if (!(context.isAdmin && context.role === "director") && !context.canManageEmployees) {
      return NextResponse.json({ ok: false, message: "You cannot change employee permissions." }, { status: 403 });
    }
    const data = await request.formData().catch(() => null);
    if (!data) return NextResponse.json({ ok: false, message: "Invalid permission selection." }, { status: 400 });
    const kind = data.get("kind");
    if (kind !== "panels" && kind !== "workbook" && kind !== "qa") {
      return NextResponse.json({ ok: false, message: "Invalid permission selection." }, { status: 400 });
    }
    if (context.role !== "director" && kind === "workbook") return NextResponse.json({ ok: false, message: "Workbook action permissions are set by direction." }, { status: 403 });
    const result = kind === "panels" ? await saveWorkspacePermissions({}, data)
      : kind === "workbook" ? await setManagerPermission(data)
      : await saveQaHomeAssignments(data);
    return NextResponse.json({ ...result, ok: Boolean(result.ok) }, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "The server could not confirm this change. Refresh and check the permissions before trying again." }, { status: 503 });
  }
}

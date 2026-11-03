import { NextResponse } from "next/server";
import { saveQaAccount } from "@/app/actions";
import { getAccessContext } from "@/lib/auth";
import { updateManagerCredentials } from "@/workbook/actions";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, message: "This request must come from your workspace." }, { status: 403 });
  }
  try {
    const context = await getAccessContext();
    if (!context) return NextResponse.json({ ok: false, message: "Your session has expired. Sign in again to save this user." }, { status: 401 });
    if (!(context.isAdmin && context.role === "director") && !context.canManageEmployees) {
      return NextResponse.json({ ok: false, message: "You cannot change employee accounts." }, { status: 403 });
    }
    const data = await request.formData().catch(() => null);
    if (!data) return NextResponse.json({ ok: false, message: "Invalid account details." }, { status: 400 });
    const kind = data.get("kind");
    if (kind !== "manager" && kind !== "qa") return NextResponse.json({ ok: false, message: "Invalid account type." }, { status: 400 });
    if (context.role !== "director" && kind !== "manager") return NextResponse.json({ ok: false, message: "You can only change your direct employees." }, { status: 403 });
    const result = kind === "manager" ? await updateManagerCredentials(data) : await saveQaAccount(data);
    return NextResponse.json({ ...result, ok: Boolean(result.ok) }, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "The server could not confirm this change. Refresh and check the user before trying again." }, { status: 503 });
  }
}

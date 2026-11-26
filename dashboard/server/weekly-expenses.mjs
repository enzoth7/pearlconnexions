// Vercel cron (Mondays): sends each home's unsent expenses that have invoices or
// receipts attached to that home's neighbourhood controller, then marks them sent.
import { createClient } from "@supabase/supabase-js";
import { collectExpenses, emailConfigured, expenseEmail, markSent, sendEmail } from "./expense-mail.mjs";

export async function handleWeeklyExpenses(request, response) {
  const send = (status, body) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(body)); };
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.authorization !== `Bearer ${secret}`) return send(401, { ok: false, message: "Unauthorised." });
  if (!emailConfigured()) return send(503, { ok: false, message: "Email sending is not set up yet." });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: homes, error } = await admin.from("qa_homes").select("id,name,controller_email").not("controller_email", "is", null);
  if (error) return send(500, { ok: false, message: error.message });

  const results = [];
  for (const home of homes) {
    const { data: pending, error: pendingError } = await admin.from("finance_expenses").select("id").eq("home_id", home.id).is("sent_at", null);
    if (pendingError) { results.push({ home: home.name, error: pendingError.message }); continue; }
    if (!pending.length) continue;
    const { data: withFiles } = await admin.from("record_attachments").select("entity_id").eq("entity", "expense").in("entity_id", pending.map((e) => e.id));
    const ids = [...new Set((withFiles ?? []).map((f) => f.entity_id))];
    if (!ids.length) continue;
    try {
      const bundle = await collectExpenses(admin, admin, ids);
      const { subject, html } = expenseEmail({ ...bundle, note: `Weekly expenses for ${home.name}.` });
      await sendEmail({ to: home.controller_email, subject, html, attachments: bundle.attachments });
      await markSent(admin, bundle.expenses, home.controller_email);
      results.push({ home: home.name, sent: bundle.expenses.length });
    } catch (sendError) {
      results.push({ home: home.name, error: sendError instanceof Error ? sendError.message : "Send failed" });
    }
  }
  return send(200, { ok: true, results });
}

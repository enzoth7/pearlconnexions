// Sends expenses (with their attached invoices/receipts) to a home's neighbourhood
// controller. Email goes through Resend when RESEND_API_KEY and PEARL_EMAIL_FROM are set.

const MAX_ATTACHED_BYTES = 30 * 1024 * 1024;
const LINK_DAYS = 14;
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.PEARL_EMAIL_FROM);
}

/** Loads expenses, their home and attachments, and downloads files to attach. */
export async function collectExpenses(admin, expenseIds) {
  const { data: expenses, error } = await admin.from("finance_expenses").select("*").in("id", expenseIds).order("expense_on");
  if (error) throw error;
  const { data: files, error: filesError } = await admin.from("record_attachments").select("*").eq("entity", "expense").in("entity_id", expenseIds).order("created_at");
  if (filesError) throw filesError;
  const homeIds = [...new Set(expenses.map((e) => e.home_id).filter(Boolean))];
  const { data: homes } = homeIds.length ? await admin.from("qa_homes").select("id,name,neighbourhood,controller_email").in("id", homeIds) : { data: [] };
  let attachedBytes = 0;
  const attachments = [];
  const links = [];
  for (const file of files) {
    const fits = attachedBytes + Number(file.size_bytes ?? 0) <= MAX_ATTACHED_BYTES;
    if (fits) {
      const download = await admin.storage.from("attachments").download(file.storage_path);
      if (!download.error) {
        const buffer = Buffer.from(await download.data.arrayBuffer());
        attachedBytes += buffer.length;
        attachments.push({ filename: file.file_name, content: buffer.toString("base64") });
        continue;
      }
    }
    const signed = await admin.storage.from("attachments").createSignedUrl(file.storage_path, LINK_DAYS * 86400);
    if (!signed.error) links.push({ name: file.file_name, url: signed.data.signedUrl });
  }
  return { expenses, files, homes: homes ?? [], attachments, links };
}

export function expenseEmail({ expenses, files, homes, links, note }) {
  const homeName = (id) => homes.find((h) => h.id === id)?.name ?? "Not assigned";
  const rows = expenses.map((e) => `<tr><td>${escapeHtml(e.expense_on)}</td><td>${escapeHtml(homeName(e.home_id))}</td><td>${escapeHtml(e.description)}</td><td>${escapeHtml(e.payee)}</td><td style="text-align:right">${money.format(Number(e.amount_gbp))}</td><td>${files.filter((f) => f.entity_id === e.id).length}</td></tr>`).join("");
  const total = expenses.reduce((sum, e) => sum + Number(e.amount_gbp), 0);
  const subject = expenses.length === 1
    ? `Pearl Connexions expense: ${expenses[0].description} (${money.format(Number(expenses[0].amount_gbp))})`
    : `Pearl Connexions expenses: ${expenses.length} items (${money.format(total)})`;
  const html = `<p>Hello,</p><p>Please find below ${expenses.length === 1 ? "an expense" : "the expenses"} from Pearl Connexions${files.length ? ", with the invoices and receipts attached" : ""}.</p>${note ? `<p>${escapeHtml(note)}</p>` : ""}
<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px" border="1"><thead><tr><th>Date</th><th>Home</th><th>Description</th><th>Payee</th><th>Amount</th><th>Files</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4"><strong>Total</strong></td><td style="text-align:right"><strong>${money.format(total)}</strong></td><td></td></tr></tfoot></table>
${links.length ? `<p>Files too large to attach (links valid for ${LINK_DAYS} days):</p><ul>${links.map((l) => `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.name)}</a></li>`).join("")}</ul>` : ""}
<p>Kind regards,<br>Pearl Connexions</p>`;
  return { subject, html };
}

export async function sendEmail({ to, subject, html, attachments }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.PEARL_EMAIL_FROM, to: [to], subject, html, attachments, reply_to: process.env.PEARL_EMAIL_REPLY_TO || undefined }),
  });
  if (!response.ok) throw new Error(`The email could not be sent (${response.status}).`);
}

/** Records the send on each expense (finance registers bump their version on every update). */
export async function markSent(admin, expenses, to) {
  const sentAt = new Date().toISOString();
  for (const e of expenses) {
    const { error } = await admin.from("finance_expenses").update({ sent_to: to, sent_at: sentAt, version: e.version + 1 }).eq("id", e.id).eq("version", e.version);
    if (error) throw error;
  }
}

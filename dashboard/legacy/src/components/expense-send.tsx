"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { privateCall } from "../../../src/shims/private-call";
import { supabase } from "../../../src/shims/supabase";
import type { Attachment } from "@/components/record-attachments";

type Expense = Record<string, unknown> & { id: string; version: number };
type Home = { id: string; name: string; controller_email?: string | null };

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const validEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

/** Sends an expense, with its attached invoices, to the home's neighbourhood controller. */
export function ExpenseSend({ expense, homes, files, onSent }: { expense: Expense; homes: Home[]; files: Attachment[]; onSent: () => void }) {
  const home = homes.find(item => item.id === expense.home_id);
  const [to, setTo] = useState(home?.controller_email ?? "");
  const [note, setNote] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Without a configured email service, open the user's mail app with links to the files.
  async function sendFromMailApp() {
    const links: string[] = [];
    for (const file of files) {
      const { data } = await supabase.storage.from("attachments").createSignedUrl(file.storage_path, 14 * 86400);
      if (data) links.push(`${file.file_name}: ${data.signedUrl}`);
    }
    const subject = `Pearl Connexions expense: ${expense.description} (${money.format(Number(expense.amount_gbp))})`;
    const body = [
      "Hello,", "",
      "Please find the expense details below.", "",
      `Date: ${expense.expense_on}`, `Home: ${home?.name ?? "Not assigned"}`, `Description: ${expense.description}`,
      `Payee: ${expense.payee}`, `Amount: ${money.format(Number(expense.amount_gbp))}`,
      ...(note ? ["", note] : []),
      ...(links.length ? ["", "Invoices and receipts (links valid for 14 days):", ...links] : []),
      "", "Kind regards,", "Pearl Connexions",
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const marked = await supabase.from("finance_expenses").update({ sent_to: to, sent_at: new Date().toISOString(), version: expense.version + 1 }).eq("id", expense.id).eq("version", expense.version);
    if (remember && home && home.controller_email !== to) {
      const form = new FormData(); form.set("home_id", home.id); form.set("to", to);
      await privateCall("save-controller-email", form);
    }
    setMessage(marked.error ? "Your email app opened. The send could not be recorded." : "Your email app opened with the expense and file links.");
  }

  async function send() {
    if (!validEmail(to)) { setError("Enter the controller's email address."); return; }
    setBusy(true); setError(""); setMessage("");
    const form = new FormData();
    form.set("expense_id", expense.id); form.set("to", to); form.set("remember", String(remember));
    if (note.trim()) form.set("note", note.trim());
    const result = await privateCall("send-expense", form);
    if (result.notConfigured) await sendFromMailApp();
    else if (result.ok) setMessage(result.message ?? "Sent.");
    else setError(result.message ?? "The expense could not be sent.");
    setBusy(false);
    if (result.ok || result.notConfigured) onSent();
  }

  return <section aria-label="Send to controller" className="rounded-xl border border-slate-200 p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-[#102c39]"><Send size={16} aria-hidden />Send to neighbourhood controller</h3>
    {Boolean(expense.sent_at) && <div className="mt-1 text-xs text-slate-600">Last sent to {String(expense.sent_to)} on {new Date(String(expense.sent_at)).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}.</div>}
    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="text-sm font-medium">Controller email
        <input type="email" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 px-3" value={to} onChange={event => setTo(event.target.value)} placeholder="controller@council.gov.uk" />
      </label>
      <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void send()}>
        <Send size={16} aria-hidden />{busy ? "Sending…" : "Send"}
      </button>
    </div>
    <label className="mt-3 block text-sm font-medium">Message (optional)
      <textarea className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} />
    </label>
    {home && <label className="mt-2 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-teal-700" checked={remember} onChange={event => setRemember(event.target.checked)} />Use this email for {home.name} from now on (also for the Monday send)</label>}
    {!files.length && <div className="mt-1 text-xs text-amber-800">No invoice attached yet. Upload it above before sending.</div>}
    {message && <div role="status" className="mt-2 text-sm text-emerald-800">{message}</div>}
    {error && <div role="alert" className="mt-2 text-sm text-rose-800">{error}</div>}
  </section>;
}

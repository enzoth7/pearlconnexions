"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hrDate, hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { RecordAttachments } from "@/components/record-attachments";
import { downloadInvoices, gbp, invoiceStatus, invoiceStatusTone, monthLabel, sumLines, type Invoice, type InvoiceLine } from "@/lib/finance-invoices";
import { supabase } from "../../../src/shims/supabase";

type EditableLine = { id?: string; line_date: string; quantity: string; quantity_label: string; description: string; unit_price: string };
const button = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-teal-800 disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-50";

const toEditable = (line: InvoiceLine): EditableLine => ({
  id: line.id, line_date: line.line_date ?? "", quantity: String(Number(line.quantity)), quantity_label: line.quantity_label ?? "",
  description: line.description, unit_price: Number(line.unit_price).toFixed(2),
});

function lineErrors(line: EditableLine) {
  if (line.description.trim().length < 2) return "Add a description.";
  if (!(Number(line.quantity) > 0)) return "Quantity must be more than 0.";
  if (!/^\d+(\.\d{1,2})?$/.test(line.unit_price)) return "Enter a price in pounds.";
  return "";
}

/** One council invoice: lines and dates while it is a draft, then approval, sending and payment. */
export function FinanceInvoiceDialog({ invoice, placementLabel, onClose, onChanged }: {
  invoice: Invoice; placementLabel: string; onClose: () => void; onChanged: () => Promise<void> | void;
}) {
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [dates, setDates] = useState({ issued_on: invoice.issued_on, due_on: invoice.due_on });
  const [payment, setPayment] = useState({ received_gbp: String(Number(invoice.received_gbp)), last_received_on: invoice.last_received_on ?? "", notes: invoice.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const draft = invoice.status === "Draft";
  const status = invoiceStatus(invoice, londonToday());

  const loadLines = useCallback(async () => {
    const { data, error: loadError } = await supabase.from("finance_invoice_lines").select("*").eq("invoice_id", invoice.id).order("position");
    if (loadError) setError(loadError.message);
    setLines(((data ?? []) as InvoiceLine[]).map(toEditable));
  }, [invoice.id]);
  useEffect(() => { void loadLines(); }, [loadLines]);
  useEffect(() => {
    setDates({ issued_on: invoice.issued_on, due_on: invoice.due_on });
    setPayment({ received_gbp: String(Number(invoice.received_gbp)), last_received_on: invoice.last_received_on ?? "", notes: invoice.notes ?? "" });
  }, [invoice]);

  async function act(task: () => Promise<string>) {
    setBusy(true); setError(""); setMessage("");
    try { setMessage(await task()); } catch (problem) { setError(problem instanceof Error ? problem.message : "Something went wrong."); }
    setBusy(false);
    await onChanged();
    await loadLines();
  }
  async function freshVersion() {
    const { data, error: readError } = await supabase.from("finance_invoices").select("version").eq("id", invoice.id).single();
    if (readError || !data) throw new Error(readError?.message ?? "This invoice is no longer available.");
    return data.version as number;
  }

  async function saveDraft() {
    const problem = lines.map(lineErrors).find(Boolean);
    if (problem) throw new Error(problem);
    if (dates.due_on < dates.issued_on) throw new Error("The due date cannot be before the invoice date.");
    const { data: current } = await supabase.from("finance_invoice_lines").select("id").eq("invoice_id", invoice.id);
    const keep = new Set(lines.map(line => line.id).filter(Boolean));
    const removed = (current ?? []).map(row => row.id as string).filter(id => !keep.has(id));
    if (removed.length) { const result = await supabase.from("finance_invoice_lines").delete().in("id", removed); if (result.error) throw new Error(result.error.message); }
    for (const [index, line] of lines.entries()) {
      const values = { position: index + 1, line_date: line.line_date || null, quantity: Number(line.quantity), quantity_label: line.quantity_label.trim() || null, description: line.description.trim(), unit_price: Number(line.unit_price) };
      const result = line.id
        ? await supabase.from("finance_invoice_lines").update(values).eq("id", line.id)
        : await supabase.from("finance_invoice_lines").insert({ ...values, invoice_id: invoice.id });
      if (result.error) throw new Error(result.error.message);
    }
    const version = await freshVersion();
    const result = await supabase.from("finance_invoices").update({ issued_on: dates.issued_on, due_on: dates.due_on, notes: payment.notes.trim(), version: version + 1 }).eq("id", invoice.id).eq("version", version);
    if (result.error) throw new Error(result.error.message);
    return "Draft saved. The total is the sum of the lines.";
  }
  async function setStatus(next: "Draft" | "Approved" | "Sent") {
    if (next === "Approved" && sumLines(lines.map(line => ({ quantity: Number(line.quantity), unit_price: Number(line.unit_price) }))) <= 0) throw new Error("Add at least one line with a price before approving.");
    if (next === "Approved") await saveDraft();
    const version = await freshVersion();
    const extra = next === "Sent" ? { sent_at: new Date().toISOString(), sent_to: "Sent outside the system" } : {};
    const result = await supabase.from("finance_invoices").update({ status: next, ...extra, version: version + 1 }).eq("id", invoice.id).eq("version", version);
    if (result.error) throw new Error(result.error.message);
    return next === "Approved" ? "Approved. It can now be downloaded or sent." : next === "Draft" ? "Back to draft: the lines can be edited again." : "Marked as sent.";
  }
  async function savePayment() {
    const received = payment.received_gbp.trim() === "" ? 0 : Number(payment.received_gbp);
    if (!(received >= 0) || received > Number(invoice.amount_gbp)) throw new Error("The amount received must be between £0 and the invoice total.");
    if (received > 0 && !payment.last_received_on) throw new Error("Enter the date of the last payment.");
    const version = await freshVersion();
    const result = await supabase.from("finance_invoices").update({ received_gbp: received, last_received_on: received > 0 ? payment.last_received_on : null, notes: payment.notes.trim(), version: version + 1 }).eq("id", invoice.id).eq("version", version);
    if (result.error) throw new Error(result.error.message);
    return "Payment saved.";
  }

  const setLine = (index: number, key: keyof EditableLine, value: string) => setLines(current => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const total = draft ? sumLines(lines.map(line => ({ quantity: Number(line.quantity) || 0, unit_price: Number(line.unit_price) || 0 }))) : Number(invoice.amount_gbp);

  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{invoice.invoice_number}</DialogTitle></DialogHeader>
    <div className="space-y-6">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Council", invoice.customer_name], ["Young person", placementLabel], ["Period", monthLabel(invoice.period_start ?? invoice.period_month)], ["Status", ""]].map(([label, value]) =>
          <div key={label} className="min-w-0 border-b border-slate-200 pb-2"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#102c39]">{label === "Status" ? <strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${invoiceStatusTone(status)}`}>{status}</strong> : value}</dd></div>)}
        {invoice.sent_at && <div className="min-w-0 border-b border-slate-200 pb-2 sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">Sent</dt><dd className="mt-1 text-sm text-[#102c39]">{hrDate(invoice.sent_at.slice(0, 10))} · {invoice.sent_to}</dd></div>}
      </dl>

      <section aria-label="Invoice lines" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-semibold text-[#102c39]">Lines</h3>
          {draft && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Invoice date<input type="date" className={hrFieldClass} value={dates.issued_on} onChange={event => setDates(current => ({ ...current, issued_on: event.target.value }))} /></label>
            <label className="text-sm font-medium">Due date<input type="date" className={hrFieldClass} value={dates.due_on} onChange={event => setDates(current => ({ ...current, due_on: event.target.value }))} /></label>
          </div>}
        </div>
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {lines.map((line, index) => draft
            ? <div key={line.id ?? `new-${index}`} className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[8.5rem_5rem_8rem_minmax(0,1fr)_7rem_6rem_2.75rem] lg:items-end">
              <label className="text-xs font-semibold text-slate-600">Date<input type="date" className={hrFieldClass} value={line.line_date} onChange={event => setLine(index, "line_date", event.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600">Qty<input type="number" min="0.01" step="0.01" className={hrFieldClass} value={line.quantity} onChange={event => setLine(index, "quantity", event.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600">Shown as<input className={hrFieldClass} placeholder="e.g. Monday x5" value={line.quantity_label} maxLength={60} onChange={event => setLine(index, "quantity_label", event.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600">Description<input className={hrFieldClass} value={line.description} maxLength={200} onChange={event => setLine(index, "description", event.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600">Unit price (£)<input type="number" min="0" step="0.01" className={hrFieldClass} value={line.unit_price} onChange={event => setLine(index, "unit_price", event.target.value)} /></label>
              <div className="text-sm font-semibold tabular-nums text-[#102c39] lg:pb-3 lg:text-right">{gbp.format((Number(line.quantity) || 0) * (Number(line.unit_price) || 0))}</div>
              <button type="button" aria-label={`Remove line ${index + 1}`} className="inline-flex size-11 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50" onClick={() => setLines(current => current.filter((_, i) => i !== index))}><Trash2 size={17} aria-hidden /></button>
            </div>
            : <div key={line.id} className="grid gap-1 p-3 text-sm sm:grid-cols-[7rem_7rem_minmax(0,1fr)_7rem_7rem]">
              <div>{hrDate(line.line_date || null)}</div><div>{line.quantity_label || Number(line.quantity)}</div><div className="break-words font-medium text-[#102c39]">{line.description}</div>
              <div className="tabular-nums sm:text-right">{gbp.format(Number(line.unit_price))}</div><div className="font-semibold tabular-nums sm:text-right">{gbp.format(Number(line.quantity) * Number(line.unit_price))}</div>
            </div>)}
          {!lines.length && <div className="p-4 text-sm text-slate-600">No lines yet.</div>}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3">
            {draft ? <button type="button" className={button} onClick={() => setLines(current => [...current, { line_date: invoice.period_start ?? "", quantity: "1", quantity_label: "", description: "", unit_price: "" }])}><Plus size={17} aria-hidden />Add line</button> : <div />}
            <strong className="text-base tabular-nums text-[#102c39]">Total due {gbp.format(total)}</strong>
          </div>
        </div>
      </section>

      {invoice.status === "Sent" && <section aria-label="Payment" className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
        <h3 className="text-base font-semibold text-[#102c39] sm:col-span-3">Payment</h3>
        <label className="text-sm font-medium">Received (£)<input type="number" min="0" step="0.01" className={hrFieldClass} value={payment.received_gbp} onChange={event => setPayment(current => ({ ...current, received_gbp: event.target.value }))} /></label>
        <label className="text-sm font-medium">Last payment on<input type="date" className={hrFieldClass} value={payment.last_received_on} onChange={event => setPayment(current => ({ ...current, last_received_on: event.target.value }))} /></label>
        <div className="self-end text-sm text-slate-600">Outstanding {gbp.format(Math.max(0, Number(invoice.amount_gbp) - (Number(payment.received_gbp) || 0)))}</div>
      </section>}

      <label className="block text-sm font-medium">Notes<textarea className={hrFieldClass} rows={2} maxLength={4000} value={payment.notes} onChange={event => setPayment(current => ({ ...current, notes: event.target.value }))} /></label>

      <RecordAttachments entity="invoice" entityId={invoice.id} />

      {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
      {message && <div role="status" className="text-sm text-emerald-800">{message}</div>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" className={button} disabled={busy} onClick={() => void act(async () => { await downloadInvoices([invoice.id]); return "PDF downloaded."; })}><Download size={17} aria-hidden />Download PDF</button>
        {draft && <button type="button" className={button} disabled={busy} onClick={() => void act(saveDraft)}>Save draft</button>}
        {draft && <button type="button" className={primary} disabled={busy} onClick={() => void act(() => setStatus("Approved"))}>Approve</button>}
        {invoice.status === "Approved" && <button type="button" className={button} disabled={busy} onClick={() => void act(() => setStatus("Draft"))}>Back to draft</button>}
        {invoice.status === "Approved" && <button type="button" className={primary} disabled={busy} onClick={() => void act(() => setStatus("Sent"))}>Mark as sent</button>}
        {invoice.status === "Sent" && <button type="button" className={primary} disabled={busy} onClick={() => void act(savePayment)}>Save payment</button>}
        {!draft && invoice.status !== "Sent" && <button type="button" className={button} disabled={busy} onClick={() => void act(async () => { const version = await freshVersion(); const result = await supabase.from("finance_invoices").update({ notes: payment.notes.trim(), version: version + 1 }).eq("id", invoice.id).eq("version", version); if (result.error) throw new Error(result.error.message); return "Notes saved."; })}>Save notes</button>}
      </div>
    </div>
  </DialogContent></Dialog>;
}

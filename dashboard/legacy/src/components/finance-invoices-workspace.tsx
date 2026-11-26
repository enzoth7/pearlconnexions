"use client";

import { Download, FilePlus2, Paperclip, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HrFilterHeader, londonToday } from "@/components/hr-register-controls";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { FinanceInvoiceDialog } from "@/components/finance-invoice-dialog";
import { CouncilsPanel, InvoiceSettingsPanel, PlacementsPanel } from "@/components/finance-invoice-setup";
import { downloadInvoices, gbp, invoiceStatus, invoiceStatusTone, monthLabel, type Customer, type FinanceSettings, type Invoice, type InvoiceStatus, type Placement } from "@/lib/finance-invoices";
import { privateCall } from "../../../src/shims/private-call";
import { supabase } from "../../../src/shims/supabase";

type Home = { id: string; name: string };
type Tab = "invoices" | "placements" | "councils" | "settings";
const tabs: { id: Tab; label: string }[] = [
  { id: "invoices", label: "Invoices" }, { id: "placements", label: "Placements" }, { id: "councils", label: "Councils" }, { id: "settings", label: "Invoice details" },
];
const statuses: InvoiceStatus[] = ["Draft", "Approved", "Sent", "Part paid", "Paid", "Overdue"];
const button = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-teal-800 disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-50";

function monthOptions() {
  const today = londonToday();
  const [year, month] = today.split("-").map(Number);
  return [-2, -1, 0, 1, 2].map(offset => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    const value = date.toISOString().slice(0, 10);
    return { value, label: monthLabel(value) };
  });
}

/** Council invoicing: prepare a month's drafts in one go, approve, download and send them together. */
export function FinanceInvoicesWorkspace() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [director, setDirector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ council: "", month: "", status: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<{ month: string; placement: string } | null>(null);
  const [sending, setSending] = useState(false);
  const today = londonToday();

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const [rows, councils, places, houses, details, files, profile] = await Promise.all([
      supabase.from("finance_invoices").select("*").order("issued_on", { ascending: false }).order("invoice_number"),
      supabase.from("finance_customers").select("*").order("name"),
      supabase.from("finance_placements").select("*").order("young_person_initials"),
      supabase.from("qa_homes").select("id,name").order("name"),
      supabase.from("finance_settings").select("*").maybeSingle(),
      supabase.from("record_attachments").select("entity_id").eq("entity", "invoice"),
      auth.user ? supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setInvoices((rows.data ?? []) as Invoice[]);
    setCustomers((councils.data ?? []) as Customer[]);
    setPlacements((places.data ?? []) as Placement[]);
    setHomes((houses.data ?? []) as Home[]);
    setSettings((details.data ?? null) as FinanceSettings | null);
    const counts: Record<string, number> = {};
    for (const file of (files.data ?? []) as { entity_id: string }[]) counts[file.entity_id] = (counts[file.entity_id] ?? 0) + 1;
    setFileCounts(counts);
    setDirector((profile.data as { role?: string } | null)?.role === "director");
    setError(rows.error?.message ?? councils.error?.message ?? places.error?.message ?? "");
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const placementLabel = useCallback((invoice: Invoice) => {
    const placement = placements.find(item => item.id === invoice.placement_id);
    if (!placement) return "—";
    const home = homes.find(item => item.id === placement.home_id)?.name;
    return home ? `${placement.young_person_initials} · ${home}` : placement.young_person_initials;
  }, [placements, homes]);

  const visible = useMemo(() => invoices.filter(invoice =>
    (!filters.council || invoice.customer_name === filters.council)
    && (!filters.month || (invoice.period_month ?? invoice.issued_on).slice(0, 7) === filters.month)
    && (!filters.status || invoiceStatus(invoice, today) === filters.status)), [invoices, filters, today]);
  const chosen = invoices.filter(invoice => selected.has(invoice.id));
  const allVisibleSelected = visible.length > 0 && visible.every(invoice => selected.has(invoice.id));

  function toggle(id: string) {
    setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function run(task: () => Promise<string>) {
    setBusy(true); setError(""); setMessage("");
    try { setMessage(await task()); } catch (problem) { setError(problem instanceof Error ? problem.message : "Something went wrong."); }
    setBusy(false);
    await load();
  }
  async function setStatus(rows: Invoice[], status: "Draft" | "Approved") {
    const eligible = rows.filter(row => status === "Approved" ? row.status === "Draft" && Number(row.amount_gbp) > 0 : row.status === "Approved");
    for (const row of eligible) {
      const result = await supabase.from("finance_invoices").update({ status, version: row.version + 1 }).eq("id", row.id).eq("version", row.version);
      if (result.error) throw new Error(`${row.invoice_number}: ${result.error.message}`);
    }
    const skipped = rows.length - eligible.length;
    return `${eligible.length} ${eligible.length === 1 ? "invoice" : "invoices"} ${status === "Approved" ? "approved" : "moved back to draft"}${skipped ? `; ${skipped} skipped (${status === "Approved" ? "only drafts with a total can be approved" : "only approved invoices can go back"})` : ""}.`;
  }
  async function markSent(rows: Invoice[]) {
    const eligible = rows.filter(row => row.status === "Approved");
    for (const row of eligible) {
      const result = await supabase.from("finance_invoices").update({ status: "Sent", sent_at: new Date().toISOString(), sent_to: "Sent outside the system", version: row.version + 1 }).eq("id", row.id).eq("version", row.version);
      if (result.error) throw new Error(`${row.invoice_number}: ${result.error.message}`);
    }
    setSelected(new Set());
    return `${eligible.length} marked as sent${rows.length - eligible.length ? `; ${rows.length - eligible.length} skipped (approve them first)` : ""}.`;
  }
  async function deleteDrafts(rows: Invoice[]) {
    const drafts = rows.filter(row => row.status === "Draft");
    if (!drafts.length) return "Only drafts can be deleted.";
    if (!window.confirm(`Delete ${drafts.length} draft ${drafts.length === 1 ? "invoice" : "invoices"}? This cannot be undone.`)) return "";
    const result = await supabase.from("finance_invoices").delete().in("id", drafts.map(row => row.id)).eq("status", "Draft");
    if (result.error) throw new Error(result.error.message);
    setSelected(new Set());
    return `${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"} deleted.`;
  }
  async function prepare() {
    if (!preparing) return;
    const { month, placement } = preparing;
    await run(async () => {
      const result = await supabase.rpc("prepare_month_invoices", { target_month: month, only_placement: placement || null });
      if (result.error) throw new Error(result.error.message);
      setPreparing(null);
      const created = Number(result.data ?? 0);
      return created ? `${created} draft ${created === 1 ? "invoice" : "invoices"} prepared for ${monthLabel(month)}. Check the lines, then approve.` : `Nothing new: ${placement ? "that placement already has" : "every active placement already has"} an invoice for ${monthLabel(month)}.`;
    });
  }
  async function sendSelected() {
    const approved = chosen.filter(row => row.status === "Approved");
    await run(async () => {
      const form = new FormData();
      for (const row of approved) form.append("invoice_ids", row.id);
      const result = await privateCall("send-invoices", form);
      if (result.notConfigured) return "Email sending is not set up yet. Download the PDFs, send them from your email, then use “Mark as sent”.";
      if (!result.ok) throw new Error(result.message ?? "The invoices could not be sent.");
      setSending(false);
      setSelected(new Set());
      return result.message ?? "Invoices sent.";
    });
  }

  const header = (key: keyof typeof filters, label: string, options?: Array<string | { value: string; label: string }>) =>
    <HrFilterHeader id={`invoice-${key}`} label={label} value={filters[key]} options={options} dark onChange={value => setFilters(current => ({ ...current, [key]: value }))} />;
  const monthChoices = [...new Set(invoices.map(row => (row.period_month ?? row.issued_on).slice(0, 7)))].sort().reverse().map(value => ({ value, label: monthLabel(`${value}-01`) }));
  const opened = invoices.find(row => row.id === openId) ?? null;
  const approvedChosen = chosen.filter(row => row.status === "Approved");

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold text-[#102c39]">Invoices</h1><div className="mt-2 text-sm text-slate-600">Council invoices for each placement, prepared in one go and sent together.</div></div>
      <nav aria-label="Invoice sections" className="flex flex-wrap gap-2">{tabs.map(item => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${tab === item.id ? "bg-[#102c39] text-white" : "border border-slate-300 bg-white text-[#102c39]"}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-[#102c39]">{message}</div>}

    {tab === "invoices" && <>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primary} disabled={busy || !placements.length} onClick={() => setPreparing({ month: monthOptions()[3].value, placement: "" })}><FilePlus2 size={18} aria-hidden />Prepare month</button>
        <button type="button" className={button} disabled={busy || !placements.length} onClick={() => setPreparing({ month: monthOptions()[2].value, placement: placements.find(item => item.active)?.id ?? placements[0]?.id ?? "" })}><Plus size={18} aria-hidden />One invoice</button>
        {!placements.length && !loading && <small className="text-sm text-slate-600">Add a council and a placement first (Placements tab).</small>}
      </div>
      {chosen.length > 0 && <section aria-label="Selected invoices" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <strong className="mr-2 text-sm text-[#102c39]">{chosen.length} selected · {gbp.format(chosen.reduce((sum, row) => sum + Number(row.amount_gbp), 0))}</strong>
        <button type="button" className={button} disabled={busy} onClick={() => void run(() => setStatus(chosen, "Approved"))}>Approve</button>
        <button type="button" className={button} disabled={busy} onClick={() => void run(() => setStatus(chosen, "Draft"))}>Back to draft</button>
        <button type="button" className={button} disabled={busy} onClick={() => void run(async () => { await downloadInvoices(chosen.map(row => row.id)); return chosen.length === 1 ? "PDF downloaded." : `${chosen.length} PDFs downloaded in one .zip.`; })}><Download size={17} aria-hidden />Download PDFs</button>
        <button type="button" className={button} disabled={busy || !approvedChosen.length} onClick={() => setSending(true)}><Send size={17} aria-hidden />Send</button>
        <button type="button" className={button} disabled={busy || !approvedChosen.length} onClick={() => void run(() => markSent(chosen))}>Mark as sent</button>
        <button type="button" className={`${button} text-rose-800`} disabled={busy || !chosen.some(row => row.status === "Draft")} onClick={() => void run(() => deleteDrafts(chosen))}>Delete drafts</button>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-slate-600 underline" onClick={() => setSelected(new Set())}>Clear</button>
      </section>}
      {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6">Loading invoices…</div> :
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Council invoices</caption>
          <thead className="bg-[#102c39] text-white"><tr>
            <th scope="col" className="w-12 px-3 py-2"><input type="checkbox" className="size-5 accent-teal-600" aria-label="Select all shown invoices" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map(row => row.id)))} /></th>
            <th scope="col" className="px-2 py-2 font-semibold">Number</th>
            <th scope="col" className="hidden px-2 py-2 md:table-cell">{header("council", "Council", [...new Set(invoices.map(row => row.customer_name))].sort())}</th>
            <th scope="col" className="hidden px-2 py-2 font-semibold lg:table-cell">Young person</th>
            <th scope="col" className="hidden px-2 py-2 sm:table-cell">{header("month", "Period", monthChoices)}</th>
            <th scope="col" className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Total</th>
            <th scope="col" className="px-2 py-2">{header("status", "Status", statuses)}</th>
            <th scope="col" className="w-16 px-2 py-2 sm:w-24"><div className="sr-only">Attachments and details</div></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-200">{visible.map(row => {
            const status = invoiceStatus(row, today);
            return <tr key={row.id} className={selected.has(row.id) ? "bg-teal-50/40" : undefined}>
              <td className="px-3 py-2.5"><input type="checkbox" className="size-5 accent-teal-700" aria-label={`Select ${row.invoice_number}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
              <td className="break-all px-2 py-2.5 font-semibold text-[#102c39]">{row.invoice_number}<small className="mt-1 block break-words text-xs font-normal text-slate-600 md:hidden">{row.customer_name}<small className="block text-xs sm:hidden">{monthLabel(row.period_start ?? row.period_month)} · {gbp.format(Number(row.amount_gbp))}</small></small></td>
              <td className="hidden break-words px-2 py-2.5 md:table-cell">{row.customer_name}</td>
              <td className="hidden break-words px-2 py-2.5 lg:table-cell">{placementLabel(row)}</td>
              <td className="hidden px-2 py-2.5 sm:table-cell">{monthLabel(row.period_start ?? row.period_month)}</td>
              <td className="hidden px-2 py-2.5 text-right tabular-nums sm:table-cell">{gbp.format(Number(row.amount_gbp))}</td>
              <td className="px-2 py-2.5"><strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${invoiceStatusTone(status)}`}>{status}</strong></td>
              <td className="px-2 py-2"><div className="flex items-center justify-end gap-2">{(fileCounts[row.id] ?? 0) > 0 && <small className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700" title={`${fileCounts[row.id]} attached files`}><Paperclip size={20} aria-hidden="true" />{fileCounts[row.id]}</small>}<button type="button" aria-label={`Open ${row.invoice_number}`} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setOpenId(row.id)}><Plus size={18} aria-hidden /></button></div></td>
            </tr>;
          })}</tbody>
        </table>{!visible.length && <div className="p-8 text-center text-sm text-slate-600">{invoices.length ? "No invoices match these filters." : "No invoices yet. Add a placement, then use “Prepare month”."}</div>}</div>}
    </>}

    {tab === "placements" && <PlacementsPanel placements={placements} customers={customers} homes={homes} onChanged={load} />}
    {tab === "councils" && <CouncilsPanel customers={customers} onChanged={load} />}
    {tab === "settings" && <InvoiceSettingsPanel settings={settings} editable={director} onChanged={load} />}

    <Dialog open={Boolean(preparing)} onOpenChange={value => { if (!value && !busy) setPreparing(null); }}><DialogContent>
      <DialogHeader><DialogTitle>{preparing?.placement ? "Prepare one invoice" : "Prepare the month's invoices"}</DialogTitle></DialogHeader>
      {preparing && <div className="space-y-4">
        <div className="text-sm text-slate-600">{preparing.placement ? "Creates a draft for this placement with its standard lines." : "Creates a draft for every active placement that has no invoice for the month yet, with its standard lines (for example, one subsistence per Monday)."}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MaintenanceSelectField name="invoice-month" label="Period" value={preparing.month} options={monthOptions()} onChange={value => setPreparing(current => current && { ...current, month: value })} />
          {preparing.placement && <MaintenanceSelectField name="invoice-placement" label="Placement" value={preparing.placement} options={placements.map(item => ({ value: item.id, label: `${item.young_person_initials} · ${customers.find(c => c.id === item.customer_id)?.name ?? ""}${item.active ? "" : " (inactive)"}` }))} onChange={value => setPreparing(current => current && { ...current, placement: value })} />}
        </div>
        <div className="flex justify-end gap-3"><button type="button" className={button} onClick={() => setPreparing(null)}>Cancel</button><button type="button" className={primary} disabled={busy} onClick={() => void prepare()}>{busy ? "Preparing…" : "Prepare drafts"}</button></div>
      </div>}
    </DialogContent></Dialog>

    <Dialog open={sending} onOpenChange={value => { if (!value && !busy) setSending(false); }}><DialogContent>
      <DialogHeader><DialogTitle>Send {approvedChosen.length} {approvedChosen.length === 1 ? "invoice" : "invoices"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">Each invoice goes to its council as a PDF attachment{settings?.queries_email ? `, with a copy to ${settings.queries_email}` : ""}. Only approved invoices are sent.</div>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">{approvedChosen.map(row => {
          const to = customers.find(c => c.id === row.customer_id)?.billing_email;
          return <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><strong className="text-[#102c39]">{row.invoice_number}</strong><div className={to ? "text-slate-700" : "font-semibold text-rose-800"}>{to ?? "No billing email for this council"}</div><div className="tabular-nums">{gbp.format(Number(row.amount_gbp))}</div></li>;
        })}</ul>
        <div className="flex justify-end gap-3"><button type="button" className={button} onClick={() => setSending(false)}>Cancel</button><button type="button" className={primary} disabled={busy || approvedChosen.some(row => !customers.find(c => c.id === row.customer_id)?.billing_email)} onClick={() => void sendSelected()}><Send size={17} aria-hidden />{busy ? "Sending…" : "Send now"}</button></div>
      </div>
    </DialogContent></Dialog>

    {opened && <FinanceInvoiceDialog invoice={opened} placementLabel={placementLabel(opened)} onClose={() => setOpenId(null)} onChanged={load} />}
  </div>;
}

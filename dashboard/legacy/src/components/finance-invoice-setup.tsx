"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hrFieldClass, londonToday } from "@/components/hr-register-controls";
import { MaintenanceSelectField } from "@/components/maintenance-select";
import { gbp, monthLabel, previewStandardLines, type Customer, type FinanceSettings, type Placement, type StandardLine } from "@/lib/finance-invoices";
import { supabase } from "../../../src/shims/supabase";

type Home = { id: string; name: string };
const button = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-teal-800 disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-50";
const tableShell = "overflow-hidden rounded-2xl border border-slate-200 bg-white";
const activePill = (active: boolean) => <strong className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>{active ? "Active" : "Inactive"}</strong>;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function nextMonth() {
  const [year, month] = londonToday().split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function describeStandardLines(lines: StandardLine[]) {
  if (!lines.length) return "No standard lines";
  return lines.map(line => `${line.description} ${gbp.format(Number(line.unit_price))}${line.basis === "monday" ? " each Monday" : Number(line.quantity ?? 1) !== 1 ? ` x${line.quantity}` : ""}`).join("; ");
}

/** Placements: one young person (initials and USN only) placed by a council, with the lines billed each month. */
export function PlacementsPanel({ placements, customers, homes, onChanged }: { placements: Placement[]; customers: Customer[]; homes: Home[]; onChanged: () => Promise<void> | void }) {
  const [editing, setEditing] = useState<Placement | "new" | null>(null);
  return <section aria-label="Placements" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-slate-600">Each active placement gets one draft invoice when you prepare a month.</div>
      <button type="button" className={primary} disabled={!customers.length} onClick={() => setEditing("new")}><Plus size={18} aria-hidden />Add placement</button>
    </div>
    {!customers.length && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Add the council first (Councils tab).</div>}
    <div className={tableShell}><table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Placements billed to councils</caption>
      <thead className="bg-[#102c39] text-white"><tr>
        <th scope="col" className="px-3 py-3 font-semibold">Young person</th>
        <th scope="col" className="px-3 py-3 font-semibold">Council</th>
        <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell">Home</th>
        <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">Billed each month</th>
        <th scope="col" className="px-3 py-3 font-semibold">Status</th>
        <th scope="col" className="w-16 px-2 py-3"><div className="sr-only">Edit</div></th>
      </tr></thead>
      <tbody className="divide-y divide-slate-200">{placements.map(item => <tr key={item.id}>
        <td className="px-3 py-3"><strong className="text-[#102c39]">{item.young_person_initials}</strong>{item.usn && <small className="block text-xs text-slate-500">USN {item.usn}</small>}</td>
        <td className="break-words px-3 py-3">{customers.find(c => c.id === item.customer_id)?.name ?? "—"}</td>
        <td className="hidden break-words px-3 py-3 md:table-cell">{homes.find(h => h.id === item.home_id)?.name ?? "—"}</td>
        <td className="hidden break-words px-3 py-3 lg:table-cell">{describeStandardLines(item.standard_lines)}</td>
        <td className="px-3 py-3">{activePill(item.active)}</td>
        <td className="px-2 py-2"><button type="button" aria-label={`Edit placement ${item.young_person_initials}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setEditing(item)}><Pencil size={16} aria-hidden /></button></td>
      </tr>)}</tbody>
    </table>{!placements.length && <div className="p-8 text-center text-sm text-slate-600">No placements yet.</div>}</div>
    {editing && <PlacementDialog placement={editing === "new" ? null : editing} customers={customers} homes={homes} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />}
  </section>;
}

function PlacementDialog({ placement, customers, homes, onClose, onSaved }: { placement: Placement | null; customers: Customer[]; homes: Home[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    customer_id: placement?.customer_id ?? customers[0]?.id ?? "", home_id: placement?.home_id ?? "",
    young_person_initials: placement?.young_person_initials ?? "", usn: placement?.usn ?? "", social_worker: placement?.social_worker ?? "",
    placement_address: placement?.placement_address ?? "", start_on: placement?.start_on ?? "", end_on: placement?.end_on ?? "",
    active: placement?.active ?? true, notes: placement?.notes ?? "",
  });
  const [lines, setLines] = useState<StandardLine[]>(placement?.standard_lines ?? [{ description: "Subsistence", unit_price: 0, basis: "monday" }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = previewStandardLines(lines, nextMonth());

  async function save() {
    const initials = form.young_person_initials.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(initials)) { setError("Use the young person's initials only (1 to 5 letters)."); return; }
    if (!form.customer_id) { setError("Choose the council."); return; }
    if (form.end_on && form.start_on && form.end_on < form.start_on) { setError("The end date cannot be before the start date."); return; }
    if (lines.some(line => line.description.trim().length < 2 || !(Number(line.unit_price) >= 0) || (line.basis === "fixed" && !(Number(line.quantity ?? 1) > 0)))) { setError("Each standard line needs a description, a price and a quantity."); return; }
    const values = {
      customer_id: form.customer_id, home_id: form.home_id || null, young_person_initials: initials, usn: form.usn.trim() || null,
      social_worker: form.social_worker.trim() || null, placement_address: form.placement_address.trim() || null,
      start_on: form.start_on || null, end_on: form.end_on || null, active: form.active, notes: form.notes.trim(),
      standard_lines: lines.map(line => ({ description: line.description.trim(), unit_price: Number(line.unit_price), basis: line.basis, ...(line.basis === "fixed" ? { quantity: Number(line.quantity ?? 1) } : {}) })),
    };
    setBusy(true);
    const result = placement
      ? await supabase.from("finance_placements").update({ ...values, version: placement.version + 1 }).eq("id", placement.id).eq("version", placement.version).select("id").maybeSingle()
      : await supabase.from("finance_placements").insert(values).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This placement changed. Close and open it again."); return; }
    await onSaved();
  }

  const setLine = (index: number, patch: Partial<StandardLine>) => setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{placement ? `Placement ${placement.young_person_initials}` : "Add placement"}</DialogTitle></DialogHeader>
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MaintenanceSelectField name="placement-council" label="Council" value={form.customer_id} options={customers.map(c => ({ value: c.id, label: c.name }))} onChange={value => setForm(current => ({ ...current, customer_id: value }))} />
        <MaintenanceSelectField name="placement-home" label="Home" value={form.home_id || "__none__"} options={[{ value: "__none__", label: "Not assigned" }, ...homes.map(h => ({ value: h.id, label: h.name }))]} onChange={value => setForm(current => ({ ...current, home_id: value === "__none__" ? "" : value }))} />
        <label className="text-sm font-medium">Young person (initials)<input className={hrFieldClass} value={form.young_person_initials} maxLength={5} autoCapitalize="characters" onChange={event => setForm(current => ({ ...current, young_person_initials: event.target.value.toUpperCase() }))} /><small className="mt-1 block text-xs font-normal text-slate-600">Initials only, never the full name.</small></label>
        <label className="text-sm font-medium">USN<input className={hrFieldClass} value={form.usn} maxLength={40} onChange={event => setForm(current => ({ ...current, usn: event.target.value }))} /></label>
        <label className="text-sm font-medium">Social worker<input className={hrFieldClass} value={form.social_worker} maxLength={120} onChange={event => setForm(current => ({ ...current, social_worker: event.target.value }))} /></label>
        <label className="text-sm font-medium">Placement address<input className={hrFieldClass} value={form.placement_address} maxLength={300} onChange={event => setForm(current => ({ ...current, placement_address: event.target.value }))} /></label>
        <label className="text-sm font-medium">Start date<input type="date" className={hrFieldClass} value={form.start_on} onChange={event => setForm(current => ({ ...current, start_on: event.target.value }))} /></label>
        <label className="text-sm font-medium">End date<input type="date" className={hrFieldClass} value={form.end_on} onChange={event => setForm(current => ({ ...current, end_on: event.target.value }))} /></label>
        <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium"><input type="checkbox" className="size-5 accent-teal-700" checked={form.active} onChange={event => setForm(current => ({ ...current, active: event.target.checked }))} />Active (billed each month)</label>
      </div>

      <section aria-label="Billed each month" className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-[#102c39]">Billed each month</h3>
        {lines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_8rem_11rem_6rem_2.75rem] lg:items-end">
          <label className="text-xs font-semibold text-slate-600">Description<input className={hrFieldClass} value={line.description} maxLength={200} onChange={event => setLine(index, { description: event.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-600">Price (£)<input type="number" min="0" step="0.01" className={hrFieldClass} value={line.unit_price} onChange={event => setLine(index, { unit_price: Number(event.target.value) })} /></label>
          <MaintenanceSelectField name={`line-basis-${index}`} label="Charged" value={line.basis} options={[{ value: "monday", label: "Each Monday" }, { value: "fixed", label: "Fixed amount" }]} onChange={value => setLine(index, { basis: value as StandardLine["basis"] })} className="text-xs font-semibold text-slate-600" />
          <label className="text-xs font-semibold text-slate-600">Quantity<input type="number" min="0.01" step="0.01" className={hrFieldClass} disabled={line.basis === "monday"} value={line.basis === "monday" ? "" : line.quantity ?? 1} placeholder={line.basis === "monday" ? "Mondays" : ""} onChange={event => setLine(index, { quantity: Number(event.target.value) })} /></label>
          <button type="button" aria-label={`Remove ${line.description || "line"}`} className="inline-flex size-11 items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50" onClick={() => setLines(current => current.filter((_, i) => i !== index))}><Trash2 size={17} aria-hidden /></button>
        </div>)}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className={button} onClick={() => setLines(current => [...current, { description: "", unit_price: 0, basis: "fixed", quantity: 1 }])}><Plus size={17} aria-hidden />Add line</button>
          <small className="text-sm text-slate-600">{monthLabel(nextMonth())}: {preview.map(line => `${line.description || "line"} ${line.basis === "monday" ? `x${line.quantity}` : ""} ${gbp.format(line.amount)}`).join(" + ")} = <strong className="text-[#102c39]">{gbp.format(preview.reduce((sum, line) => sum + line.amount, 0))}</strong></small>
        </div>
      </section>

      <label className="block text-sm font-medium">Notes<textarea className={hrFieldClass} rows={2} maxLength={2000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
      <div className="flex justify-end gap-3"><button type="button" className={button} onClick={onClose}>Cancel</button><button type="button" className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save placement"}</button></div>
    </div>
  </DialogContent></Dialog>;
}

/** Councils that receive invoices, with their billing email and payment terms. */
export function CouncilsPanel({ customers, onChanged }: { customers: Customer[]; onChanged: () => Promise<void> | void }) {
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  return <section aria-label="Councils" className="space-y-4">
    <div className="flex justify-end"><button type="button" className={primary} onClick={() => setEditing("new")}><Plus size={18} aria-hidden />Add council</button></div>
    <div className={tableShell}><table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">Councils</caption>
      <thead className="bg-[#102c39] text-white"><tr>
        <th scope="col" className="px-3 py-3 font-semibold">Council</th>
        <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell">Billing email</th>
        <th scope="col" className="px-3 py-3 font-semibold">Pays within</th>
        <th scope="col" className="px-3 py-3 font-semibold">Status</th>
        <th scope="col" className="w-16 px-2 py-3"><div className="sr-only">Edit</div></th>
      </tr></thead>
      <tbody className="divide-y divide-slate-200">{customers.map(item => <tr key={item.id}>
        <td className="break-words px-3 py-3 font-semibold text-[#102c39]">{item.name}{item.contact_name && <small className="block text-xs font-normal text-slate-500">{item.contact_name}</small>}</td>
        <td className="hidden break-all px-3 py-3 md:table-cell">{item.billing_email ?? <small className="text-sm text-rose-800">Missing: needed to email invoices</small>}</td>
        <td className="px-3 py-3">{item.payment_terms_days} days</td>
        <td className="px-3 py-3">{activePill(item.active)}</td>
        <td className="px-2 py-2"><button type="button" aria-label={`Edit ${item.name}`} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 text-teal-800" onClick={() => setEditing(item)}><Pencil size={16} aria-hidden /></button></td>
      </tr>)}</tbody>
    </table>{!customers.length && <div className="p-8 text-center text-sm text-slate-600">No councils yet.</div>}</div>
    {editing && <CouncilDialog customer={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />}
  </section>;
}

function CouncilDialog({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: customer?.name ?? "", billing_email: customer?.billing_email ?? "", contact_name: customer?.contact_name ?? "", payment_terms_days: String(customer?.payment_terms_days ?? 5), active: customer?.active ?? true, notes: customer?.notes ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (form.name.trim().length < 2) { setError("Enter the council's name."); return; }
    if (form.billing_email.trim() && !emailPattern.test(form.billing_email.trim())) { setError("Enter a valid billing email."); return; }
    const terms = Number(form.payment_terms_days);
    if (!Number.isInteger(terms) || terms < 0 || terms > 120) { setError("Payment terms must be between 0 and 120 days."); return; }
    const values = { name: form.name.trim(), billing_email: form.billing_email.trim().toLowerCase() || null, contact_name: form.contact_name.trim() || null, payment_terms_days: terms, active: form.active, notes: form.notes.trim() };
    setBusy(true);
    const result = customer
      ? await supabase.from("finance_customers").update({ ...values, version: customer.version + 1 }).eq("id", customer.id).eq("version", customer.version).select("id").maybeSingle()
      : await supabase.from("finance_customers").insert(values).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "This council changed. Close and open it again."); return; }
    await onSaved();
  }
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>{customer ? customer.name : "Add council"}</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Council<input className={hrFieldClass} value={form.name} maxLength={120} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
        <label className="text-sm font-medium">Billing email<input type="email" className={hrFieldClass} value={form.billing_email} onChange={event => setForm(current => ({ ...current, billing_email: event.target.value }))} /></label>
        <label className="text-sm font-medium">Contact<input className={hrFieldClass} value={form.contact_name} maxLength={120} onChange={event => setForm(current => ({ ...current, contact_name: event.target.value }))} /></label>
        <label className="text-sm font-medium">Pays within (days)<input type="number" min="0" max="120" step="1" className={hrFieldClass} value={form.payment_terms_days} onChange={event => setForm(current => ({ ...current, payment_terms_days: event.target.value }))} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" className="size-5 accent-teal-700" checked={form.active} onChange={event => setForm(current => ({ ...current, active: event.target.checked }))} />Active</label>
      </div>
      <label className="block text-sm font-medium">Notes<textarea className={hrFieldClass} rows={2} maxLength={2000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
      <div className="flex justify-end gap-3"><button type="button" className={button} onClick={onClose}>Cancel</button><button type="button" className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save council"}</button></div>
    </div>
  </DialogContent></Dialog>;
}

const settingFields: { key: keyof FinanceSettings; label: string }[] = [
  { key: "company_name", label: "Company name" }, { key: "trading_name", label: "Trading name" }, { key: "address", label: "Address" },
  { key: "company_number", label: "Company registration number" }, { key: "website", label: "Website" }, { key: "queries_email", label: "Email for invoice queries" },
  { key: "bank_name", label: "Bank" }, { key: "account_name", label: "Account name" }, { key: "account_number", label: "Account number" },
  { key: "sort_code", label: "Sort code" }, { key: "thanks_line", label: "Closing line" },
];

/** Company and bank details printed on every invoice. Only the director changes them. */
export function InvoiceSettingsPanel({ settings, editable, onChanged }: { settings: FinanceSettings | null; editable: boolean; onChanged: () => Promise<void> | void }) {
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(settingFields.map(field => [field.key, String(settings?.[field.key] ?? "")])));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!settings) return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Invoice details are not set up yet.</div>;
  async function save() {
    if (!settings) return;
    if (form.queries_email && !emailPattern.test(form.queries_email.trim())) { setError("Enter a valid email for queries."); return; }
    setBusy(true); setError(""); setMessage("");
    const values = Object.fromEntries(settingFields.map(field => [field.key, (form[field.key] ?? "").trim()]));
    const result = await supabase.from("finance_settings").update({ ...values, version: settings.version + 1 }).eq("id", settings.id).eq("version", settings.version).select("id").maybeSingle();
    setBusy(false);
    if (result.error || !result.data) { setError(result.error?.message ?? "These details changed. Reload the page."); return; }
    setMessage("Saved. New PDFs use these details.");
    await onChanged();
  }
  return <section aria-label="Invoice details" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="text-sm text-slate-600">{editable ? "Printed at the foot of every invoice." : "Printed at the foot of every invoice. Only the director can change them."}</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{settingFields.map(field =>
      <label key={field.key} className="text-sm font-medium">{field.label}<input className={hrFieldClass} value={form[field.key] ?? ""} readOnly={!editable} disabled={!editable} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} /></label>)}</div>
    {error && <div role="alert" className="text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="text-sm text-emerald-800">{message}</div>}
    {editable && <div className="flex justify-end"><button type="button" className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save details"}</button></div>}
  </section>;
}

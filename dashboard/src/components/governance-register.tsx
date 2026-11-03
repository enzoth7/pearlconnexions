"use client";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { recordLabels, recordStates, saveGovernance, type GovernanceRecord, type RecordKind } from "@/lib/governance";
import type { Home } from "@/lib/types";

const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-2 focus:outline-teal-700";
export function GovernanceRegister({ kind, homes, records, canManageMaintenance }: { kind: RecordKind; homes: Home[]; records: GovernanceRecord[]; canManageMaintenance: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<GovernanceRecord | null | undefined>();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [homeFilter, setHomeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const followUpOnly = kind === "maintenance" && Boolean(editing) && !canManageMaintenance;
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(["description", "location", "category", "priority", "owner", "due_on", "controls", "action_taken", "follow_up", "checks", "workbook_action_id"].map(key => [key, String(form.get(key) ?? "")]));
    const record = { ...(editing ?? {}), kind, home_id: String(form.get("home_id")), occurred_on: String(form.get("occurred_on")), title: String(form.get("title")), status: String(form.get("status")),
      data: followUpOnly ? { ...editing!.data, follow_up: [editing!.data.follow_up, String(form.get("follow_up") ?? "").trim()].filter(Boolean).join("\n") } : { ...data, physical_intervention: form.has("physical_intervention"), reported_within_24h: form.has("reported_within_24h") } };
    start(async () => {
      const result = await saveGovernance("/api/governance", { operation: "record", record }); setMessage(result.message);
      if (result.ok) { setEditing(undefined); router.refresh(); }
    });
  }
  const shown = records.filter(row => (!homeFilter || row.home_id === homeFilter) && (!stateFilter || row.status === stateFilter) && `${row.title} ${row.data.description}`.toLowerCase().includes(filter.toLowerCase()));
  const input = (name: string, label: string, type = "text", required = false) => <label className="block text-sm font-medium">{label}<input className={field} name={name} type={type} required={required} defaultValue={String((editing?.data as Record<string, unknown> | undefined)?.[name] ?? "")} /></label>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold tracking-tight">{recordLabels[kind]}</h1><button className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" disabled={!homes.length} onClick={() => { setEditing(null); setMessage(""); }}>Add {kind === "risks" ? "risk assessment" : kind === "maintenance" ? "issue" : kind.slice(0, -1)}</button></div>
    {!homes.length && <p className="rounded-xl border border-slate-200 bg-white p-5">No homes are assigned. Ask a director to link your account to a home in Settings.</p>}
    {message && <p role="status" className="rounded-xl border border-slate-200 bg-white p-4">{message}</p>}
    {editing !== undefined && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" aria-label="Record editor"><form onSubmit={save} key={editing?.id ?? "new"} className="space-y-5">
      <h2 className="text-xl font-semibold">{editing ? "Update record" : "New record"}</h2>
      <fieldset disabled={pending || followUpOnly} className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Home<select name="home_id" className={field} defaultValue={editing?.home_id ?? homes[0]?.id} required disabled={Boolean(editing)}>{homes.map(home => <option key={home.id} value={home.id}>{home.name}</option>)}</select></label>
        <label className="text-sm font-medium">Date<input type="date" name="occurred_on" className={field} defaultValue={editing?.occurred_on ?? new Date().toLocaleDateString("en-CA")} required /></label>
        <label className="text-sm font-medium sm:col-span-2">Title<input name="title" className={field} defaultValue={editing?.title} minLength={5} maxLength={240} required /></label>
        <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" className={field} rows={3} defaultValue={editing?.data.description} minLength={5} required /></label>
        {kind === "audits" && <><label className="text-sm font-medium">Audit type<select name="category" className={field} defaultValue={editing?.data.category ?? "Coordinator"}>{["Coordinator", "Operations", "Other"].map(value => <option key={value}>{value}</option>)}</select></label>{input("checks", "Checks completed")}{input("action_taken", "Findings and actions")}</>}
        {kind === "incidents" && <>{input("category", "Incident type", "text", true)}<label className="text-sm font-medium">Severity<select name="priority" className={field} defaultValue={editing?.data.priority ?? "Moderate"}>{["Low", "Moderate", "High", "Critical"].map(value => <option key={value}>{value}</option>)}</select></label>{input("action_taken", "Action taken", "text", true)}<div className="space-y-2">{["physical_intervention", "reported_within_24h"].map(key => <label className="flex min-h-11 items-center gap-3" key={key}><input type="checkbox" className="size-5 accent-teal-700" name={key} defaultChecked={Boolean((editing?.data as Record<string, unknown> | undefined)?.[key])} />{key === "physical_intervention" ? "Physical intervention involved" : "Reported within 24 hours"}</label>)}</div></>}
        {kind === "risks" && <>{input("location", "Area or activity", "text", true)}{input("controls", "Existing controls", "text", true)}{input("action_taken", "Further measures required")}</>}
        {kind === "maintenance" && input("location", "Location in the home", "text", true)}
        {(kind === "risks" || kind === "maintenance") && <label className="text-sm font-medium">{kind === "risks" ? "Internal risk level" : "Priority"}<select name="priority" className={field} defaultValue={editing?.data.priority ?? "Moderate"}>{(kind === "risks" ? ["Low", "Moderate", "High", "Extremely high"] : ["Low", "Moderate", "High", "Urgent"]).map(value => <option key={value}>{value}</option>)}</select></label>}
        {input("owner", "Responsible person", "text", kind === "risks")}{input("due_on", kind === "risks" ? "Next review" : "Target date", "date", kind === "risks")}
        <label className="text-sm font-medium">Status<select name="status" className={field} defaultValue={editing?.status ?? recordStates[kind][0]} disabled={kind === "maintenance" && !canManageMaintenance}>{recordStates[kind].map(value => <option key={value}>{value}</option>)}</select></label>
        {kind === "audits" && input("workbook_action_id", "Linked Workbook action ID (optional)")}
      </fieldset>
      {editing && <input type="hidden" name="home_id" value={editing.home_id} />}
      {kind === "maintenance" && !canManageMaintenance && !editing && <input type="hidden" name="status" value="Reported" />}
      {followUpOnly && <>{["occurred_on", "title", "status"].map(key => <input type="hidden" key={key} name={key} value={String(editing![key as keyof GovernanceRecord])} />)}{Object.entries(editing!.data).filter(([key]) => key !== "follow_up").map(([key, value]) => <input key={key} type="hidden" name={key} value={String(value)} />)}</>}
      {followUpOnly && editing?.data.follow_up && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">{editing.data.follow_up}</p>}
      <label className="block text-sm font-medium">{followUpOnly ? "Add follow-up note" : "Follow-up notes"}<textarea className={field} name="follow_up" rows={3} defaultValue={followUpOnly ? "" : editing?.data.follow_up} disabled={pending} required={followUpOnly} /></label>
      {kind === "audits" && <Link className="inline-flex min-h-11 items-center text-teal-800 underline" href="/workbook/actions" target="_blank">Open Workbook to create a corrective action</Link>}
      <div className="flex gap-3"><button disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white">{pending ? "Saving…" : "Save record"}</button><button type="button" disabled={pending} onClick={() => setEditing(undefined)} className="min-h-11 rounded-xl border border-slate-300 px-5">Cancel</button></div>
    </form></section>}
    <div className="grid gap-3 sm:grid-cols-3"><label>Search<input className={field} value={filter} onChange={e => setFilter(e.target.value)} /></label><label>Home<select className={field} value={homeFilter} onChange={e => setHomeFilter(e.target.value)}><option value="">All assigned homes</option>{homes.map(home => <option key={home.id} value={home.id}>{home.name}</option>)}</select></label><label>Status<select className={field} value={stateFilter} onChange={e => setStateFilter(e.target.value)}><option value="">All statuses</option>{recordStates[kind].map(value => <option key={value}>{value}</option>)}</select></label></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">{recordLabels[kind]}</caption><thead className="border-b bg-slate-50"><tr>{["Record", "Home", "Date", "Status", "Responsible", ""].map((label, i) => <th className="p-4" key={i}>{label || "Details"}</th>)}</tr></thead><tbody>{shown.map(row => <tr className="border-b last:border-0" key={row.id}><td className="p-4 font-semibold">{row.title}</td><td className="p-4">{homes.find(home => home.id === row.home_id)?.name}</td><td className="whitespace-nowrap p-4">{row.occurred_on}</td><td className="p-4">{row.status}</td><td className="p-4">{row.data.owner || "Unassigned"}</td><td className="p-4"><button className="min-h-11 font-semibold text-teal-800 underline" onClick={() => { setEditing(row); setMessage(""); }}>Open<span className="sr-only"> {row.title}</span></button></td></tr>)}</tbody></table>{!shown.length && <p className="p-6 text-slate-600">No records match these filters.</p>}</div>
  </div>;
}

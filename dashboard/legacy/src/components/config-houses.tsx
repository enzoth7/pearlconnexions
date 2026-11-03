"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveHouse } from "@/app/config/houses/actions";
import type { Home } from "@/lib/types";

const services = ["Children's Home", "Supported Living", "Supported Accommodation"] as const;
const inputClass = "mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

export function ConfigHouses({ houses, canEdit }: { houses: Home[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Home | "new" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    startTransition(async () => {
      const result = await saveHouse(data);
      setFeedback(result.message);
      if (result.ok) { setEditing(null); router.refresh(); }
    });
  }

  const current = editing === "new" ? null : editing;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">Name, address and current status for each house.</p>
      {canEdit && <button type="button" onClick={() => { setEditing("new"); setFeedback(""); }} className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-900">Add house</button>}
    </div>
    {feedback && <p role="status" className="text-sm text-slate-700">{feedback}</p>}
    {editing && canEdit && <form key={current?.id ?? "new"} onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <h3 className="text-lg font-semibold text-slate-950 sm:col-span-2">{current ? `Edit ${current.name}` : "Add house"}</h3>
      {current && <input type="hidden" name="id" value={current.id} />}
      <label className="text-sm font-medium text-slate-800">Name<input className={inputClass} name="name" defaultValue={current?.name ?? ""} minLength={2} maxLength={120} required disabled={pending} /></label>
      <label className="text-sm font-medium text-slate-800">Address<input className={inputClass} name="address" defaultValue={current?.address ?? ""} minLength={current ? undefined : 5} maxLength={300} required={!current} disabled={pending} /></label>
      <label className="text-sm font-medium text-slate-800">Service<select className={inputClass} name="provision" defaultValue={current?.provision ?? ""} required disabled={pending}><option value="" disabled>Select a service</option>{services.map(service => <option key={service} value={service}>{service}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium text-slate-800"><input type="checkbox" className="size-5 accent-teal-800" name="active" defaultChecked={current?.active ?? true} disabled={pending} />Active</label>
      <div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save house"}</button><button type="button" onClick={() => setEditing(null)} disabled={pending} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700">Cancel</button></div>
    </form>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[38rem] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="px-5 py-4 font-semibold">House</th><th scope="col" className="px-5 py-4 font-semibold">Address</th><th scope="col" className="px-5 py-4 font-semibold">Status</th>{canEdit && <th scope="col" className="px-5 py-4 font-semibold">Actions</th>}</tr></thead><tbody>
        {houses.map(house => <tr key={house.id} className="border-t border-slate-200"><td className="px-5 py-4 font-semibold text-slate-950">{house.name}</td><td className="px-5 py-4 text-slate-700">{house.address || <span className="text-slate-500">Address not set</span>}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${house.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{house.active ? "Active" : "Inactive"}</span></td>{canEdit && <td className="px-5 py-4"><button type="button" onClick={() => { setEditing(house); setFeedback(""); }} className="min-h-11 font-semibold text-teal-800 underline">Edit<span className="sr-only"> {house.name}</span></button></td>}</tr>)}
      </tbody></table>
      {houses.length === 0 && <p className="p-6 text-sm text-slate-600">No houses have been added yet.</p>}
    </div>
  </section>;
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type ActivityRow = {
  id: string;
  occurredAt: string | null;
  user: string;
  action: string;
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London",
});

export function ActivityLogTable({ rows }: { rows: ActivityRow[] }) {
  const [selectedUser, setSelectedUser] = useState("");
  const users = [...new Set(rows.map(row => row.user))].sort((a, b) => a.localeCompare(b));
  const visibleRows = selectedUser ? rows.filter(row => row.user === selectedUser) : rows;

  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[42rem] text-left text-sm">
      <thead className="bg-slate-50 text-slate-600"><tr>
        <th scope="col" className="px-5 py-4 font-semibold">Date & time</th>
        <th scope="col" className="px-5 py-4 font-semibold"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label="Filter by user" className={`-ml-1 inline-flex min-h-9 items-center gap-1 rounded px-1 font-semibold hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-teal-700 ${selectedUser ? "text-teal-800" : "text-slate-600"}`}>Users<ChevronDown size={15} aria-hidden="true" /></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-52"><DropdownMenuRadioGroup value={selectedUser} onValueChange={setSelectedUser}><DropdownMenuRadioItem value="">All users</DropdownMenuRadioItem>{users.map(user => <DropdownMenuRadioItem key={user} value={user}>{user}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></th>
        <th scope="col" className="px-5 py-4 font-semibold">Action</th>
      </tr></thead>
      <tbody>{visibleRows.map(row => <tr key={row.id} className="border-t border-slate-200"><td className="whitespace-nowrap px-5 py-4 text-slate-700">{row.occurredAt ? dateTime.format(new Date(row.occurredAt)) : "—"}</td><td className="px-5 py-4 font-medium text-slate-950">{row.user}</td><td className="px-5 py-4 text-slate-700">{row.action}</td></tr>)}</tbody>
    </table>
    {visibleRows.length === 0 && <p className="p-6 text-sm text-slate-600">{selectedUser ? "No activity for this user." : "No activity has been recorded yet."}</p>}
  </div>;
}

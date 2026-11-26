/** Shared by Homes (Quality) and Houses (Settings): active is green, inactive is red. */
export function HouseStatusBadge({ active }: { active: boolean }) {
  return <strong className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>
    {active ? "Active" : "Inactive"}
  </strong>;
}

/** Supported Living is CQC-regulated; children's homes and supported accommodation sit under Ofsted. */
export function HouseRegulator({ provision }: { provision: string }) {
  return <small className="mt-1 block text-xs font-semibold text-slate-500">{provision === "Supported Living" ? "CQC" : "Ofsted"}</small>;
}

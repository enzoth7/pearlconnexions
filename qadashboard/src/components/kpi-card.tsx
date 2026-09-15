import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value, note, icon: Icon, tone = "blue", progress, href, linkLabel }: { label: string; value: string | number; note?: string; icon: LucideIcon; tone?: "blue" | "amber" | "slate" | "green" | "red" | "violet"; progress?: number | null; href?: string; linkLabel?: string }) {
  const tones = {
    blue: { icon: "bg-blue-50 text-blue-600", value: "text-[#102a52]", bar: "bg-blue-500" },
    amber: { icon: "bg-orange-50 text-orange-600", value: "text-orange-700", bar: "bg-orange-500" },
    slate: { icon: "bg-slate-100 text-slate-600", value: "text-[#102a52]", bar: "bg-slate-400" },
    green: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700", bar: "bg-emerald-500" },
    red: { icon: "bg-red-50 text-red-600", value: "text-red-600", bar: "bg-red-500" },
    violet: { icon: "bg-violet-50 text-violet-600", value: "text-[#102a52]", bar: "bg-violet-500" },
  };
  const selected = tones[tone];
  const safeProgress = progress === null || progress === undefined ? 100 : Math.min(100, Math.max(0, progress));
  const card = <Card className={`relative min-h-32 transition-[box-shadow,transform] duration-200 ${href ? "group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_28px_rgba(15,42,78,0.12)]" : ""}`}>
    <CardContent className="p-4 pb-6 sm:p-5 sm:pb-7">
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${selected.icon}`}><Icon className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#31537e]">{label}</p>
          <p className={`mt-1 text-3xl font-extrabold tracking-tight ${selected.value}`}>{value}</p>
          {note ? <p className="mt-0.5 text-xs font-medium text-slate-500">{note}</p> : null}
        </div>
        {href ? <ArrowUpRight className="ms-auto size-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-700" aria-hidden="true" /> : null}
      </div>
      <span className="absolute inset-x-4 bottom-3 h-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><span className={`block h-full rounded-full ${selected.bar}`} style={{ width: `${safeProgress}%` }} /></span>
    </CardContent>
  </Card>;
  return href ? <Link href={href} aria-label={linkLabel ?? `View ${label}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">{card}</Link> : card;
}

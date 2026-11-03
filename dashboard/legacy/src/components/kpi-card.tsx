import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

const colours = { blue: "#176b93", amber: "#a15d18", slate: "#496575", green: "#087e65", red: "#ac4545", violet: "#7053a0" };

export function KpiCard({ label, value, note, icon: Icon, tone = "blue", progress, href, linkLabel }: {
  label: string; value: string | number; note?: string; icon: LucideIcon; tone?: keyof typeof colours;
  progress?: number | null; href?: string; linkLabel?: string;
}) {
  const content = <>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[.81rem] leading-5 font-semibold text-slate-600">{label}</p>
      <Icon size={17} color={colours[tone]} className="shrink-0" aria-hidden="true" />
    </div>
    <p className="mt-3 text-[2rem] leading-none font-semibold tracking-[-.045em] tabular-nums">{value}</p>
    {typeof progress === "number" && <div className="metric-segments" aria-hidden="true"><i style={{ width: Math.min(100, Math.max(0, progress)) + "%", backgroundColor: colours[tone] }} /></div>}
    <p className="mt-auto flex items-center justify-between gap-1 pt-3 text-xs leading-5 text-slate-600">{note}{href && <ArrowUpRight size={14} aria-hidden="true" />}</p>
  </>;
  const classes = "flex min-w-0 flex-col rounded-2xl border border-[#dce5e2] bg-white p-4 sm:p-5";
  return href ? <Link href={href} aria-label={linkLabel} className={classes + " hover:border-teal-600"}>{content}</Link> : <div className={classes}>{content}</div>;
}

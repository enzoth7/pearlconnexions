"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ChevronDown, ChevronRight, ClipboardCheck, Landmark, Link2, LogOut, Settings, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { signOut, switchAccount } from "@/app/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AccessContext } from "@/lib/auth";

type Section = { label: string; href: string };
type Area = { label: string; icon: LucideIcon; sections: Section[] };

function availableAreas(qa: AccessContext["role"], workbook: AccessContext["workbookRole"], finance: boolean, hr: boolean, isAdmin: boolean) {
  const areas: Area[] = [];
  if (qa !== "pending") areas.push({
    label: "Quality assurance", icon: ClipboardCheck,
    sections: qa === "director" ? [
      { label: "Overview", href: "/director" },
      { label: "Reviews", href: "/director/reviews" },
      { label: "Homes", href: "/director/homes" },
    ] : [{ label: "My reports", href: "/portal" }],
  });
  if (workbook) areas.push({
    label: "Workbook", icon: BookOpen, sections: [
      { label: "Overview", href: "/workbook" },
      { label: "Calendar", href: "/workbook/calendar" },
      { label: "Action register", href: "/workbook/actions" },
      { label: "Action review", href: "/workbook/reviews" },
      { label: "Completed actions", href: "/workbook/archive" },
      ...(workbook === "manager" ? [{ label: "My team", href: "/workbook/team" }] : []),
    ],
  });
  if (finance) areas.push({ label: "Finance", icon: Landmark, sections: [{ label: "Overview", href: "/finance" }] });
  if (hr) areas.push({ label: "HR", icon: UsersRound, sections: [{ label: "Overview", href: "/hr" }] });
  if (areas.length || isAdmin) areas.push({ label: "Links", icon: Link2, sections: [
    { label: "Quick links", href: "/links" },
  ] });
  if (isAdmin) areas.push({ label: "Settings", icon: Settings, sections: [
    { label: "Users & permissions", href: "/config/users" },
  ] });
  return areas;
}

function MobilePicker({ label, value, options }: { label: string; value: string; options: Section[] }) {
  const router = useRouter();
  return <label className="workspace-picker">
    <div className="workspace-picker-label">{label}</div>
    <select aria-label={label} value={value} onChange={(event) => router.push(event.target.value)}>
      {options.map((option) => <option value={option.href} key={option.href}>{option.label}</option>)}
    </select>
    <ChevronDown size={15} aria-hidden="true" />
  </label>;
}

export function WorkspaceNavigation({ name, qaRole, workbookRole, finance, hr, isAdmin, children }: {
  name: string; qaRole: AccessContext["role"]; workbookRole: AccessContext["workbookRole"];
  finance: boolean; hr: boolean; isAdmin: boolean; children: React.ReactNode;
}) {
  const path = usePathname();
  const areas = availableAreas(qaRole, workbookRole, finance, hr, isAdmin);
  // Longest match keeps Finance, HR and detail pages under the right heading.
  const matches = (href: string) => path === href || path.startsWith(href + "/") ||
    (href === "/config/users" && (path === "/config/permissions" || path.startsWith("/config/permissions/")));
  const active = areas.flatMap(area => area.sections.map(section => ({ area, section })))
    .filter(({ section }) => matches(section.href))
    .sort((a, b) => b.section.href.length - a.section.href.length)[0];
  if (!active) return <main>{children}</main>;
  const { area, section } = active;
  const roleLabel = qaRole === "director" ? "Director" : qaRole === "house_lead" ? "House lead" : "Manager";
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  return (
    <div className="workspace">
      <a href="#main" className="workspace-skip">Skip to content</a>
      <aside className="workspace-primary">
        <Link href="/" className="workspace-brand" aria-label="Pearl Connexions home">
          <Image className="workspace-brand-full" src="/pearl-logo-white.png" width={1963} height={791} alt="" preload />
          <Image className="workspace-brand-icon" src="/isotipoByN.png" width={64} height={64} alt="" loading="eager" />
        </Link>
        <nav className="workspace-areas" aria-label="Workspace areas">
          {areas.map(item => <Link key={item.label} href={item.sections[0].href}
            aria-label={item.label} title={item.label} aria-current={item === area ? "true" : undefined} className="workspace-area">
            <item.icon size={18} strokeWidth={1.65} aria-hidden="true" /><div className="workspace-area-text">{item.label}</div>
          </Link>)}
        </nav>
      </aside>
      <aside className="workspace-secondary">
        <h2>{area.label}</h2>
        <nav aria-label={area.label + " sections"}>
          {area.sections.map(item => <Link key={item.href} href={item.href} className="workspace-section"
            aria-current={item === section ? (path === item.href ? "page" : "location") : undefined}>
            {item.label}{item === section && <ChevronRight size={14} aria-hidden="true" />}
          </Link>)}
        </nav>
      </aside>
      <nav className="workspace-mobile" aria-label="Workspace navigation">
        <MobilePicker label="Area" value={area.sections[0].href} options={areas.map(a => ({ label: a.label, href: a.sections[0].href }))} />
        <MobilePicker label="Section" value={section.href} options={area.sections} />
      </nav>
      <div className="workspace-toolbar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="workspace-account" aria-label={`Account menu for ${name}`}>
              <div className="workspace-avatar" aria-hidden="true">{initials}</div>
              <div className="workspace-identity"><strong>{name}</strong><div>{roleLabel}</div></div>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-52 border border-slate-200 bg-white p-1.5 shadow-lg">
            <DropdownMenuItem onSelect={() => startTransition(() => switchAccount())} className="min-h-10 gap-2.5 px-3">
              <UserRound size={16} aria-hidden="true" />Switch account
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => startTransition(() => signOut())} className="min-h-10 gap-2.5 px-3">
              <LogOut size={16} aria-hidden="true" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="workspace-canvas">
        <main id="main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}

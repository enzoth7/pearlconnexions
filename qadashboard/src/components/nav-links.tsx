"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardCheck, FileBarChart, Home, Settings, Users } from "lucide-react";
import { cn } from "cn";

const directorLinks = [
  { label: "Overview", href: "/director", Icon: FileBarChart },
  { label: "Reviews", href: "/director/reviews", Icon: ClipboardCheck },
  { label: "Homes", href: "/director/homes", Icon: Building2 },
  { label: "Users", href: "/director/users", Icon: Users },
  { label: "Settings", href: "/director/settings", Icon: Settings },
];

const leadLinks = [{ label: "My reports", href: "/portal", Icon: Home }];

export function NavLinks({ role }: { role: "director" | "house_lead" }) {
  const pathname = usePathname();
  const links = role === "director" ? directorLinks : leadLinks;
  return (
    <nav aria-label="Primary navigation" className="flex w-full gap-1 overflow-x-auto py-1 sm:justify-center lg:w-auto lg:overflow-visible lg:py-0">
      {links.map(({ label, href, Icon }) => {
        const active = pathname === href || (href !== "/director" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 shrink-0 cursor-pointer items-center gap-2 border-b-[3px] border-transparent px-3 text-sm font-semibold text-blue-100 transition-colors duration-200 hover:bg-white/10 hover:text-white xl:px-4",
              active && "border-sky-400 bg-white/10 text-white",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

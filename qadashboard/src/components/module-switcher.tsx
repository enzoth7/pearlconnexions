"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Landmark,
  UsersRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const directorModules = [
  {
    label: "Quality assurance",
    href: "/director",
    Icon: ClipboardCheck,
    matches: (pathname: string) =>
      pathname.startsWith("/director") &&
      !pathname.startsWith("/director/finance") &&
      !pathname.startsWith("/director/hr"),
  },
  {
    label: "Finance",
    href: "/director/finance",
    Icon: Landmark,
    matches: (pathname: string) => pathname.startsWith("/director/finance"),
  },
  {
    label: "HR",
    href: "/director/hr",
    Icon: UsersRound,
    matches: (pathname: string) => pathname.startsWith("/director/hr"),
  },
];

export function ModuleSwitcher({
  role,
}: {
  role: "director" | "house_lead";
}) {
  const pathname = usePathname();

  if (role !== "director") {
    return (
      <div className="text-sm font-bold tracking-tight text-white sm:text-base">
        Quality assurance
      </div>
    );
  }

  const activeModule =
    directorModules.find((module) => module.matches(pathname)) ??
    directorModules[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-bold tracking-tight text-white outline-none transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-300 sm:text-base"
          aria-label={`Current area: ${activeModule.label}. Choose another area`}
        >
          {activeModule.label}
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-60 border border-slate-200 bg-white p-2 shadow-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
          Pearl Connexions areas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {directorModules.map(({ label, href, Icon, matches }) => {
          const active = matches(pathname);
          return (
            <DropdownMenuItem key={href} asChild>
              <Link
                href={href}
                className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 font-semibold text-[#102a52] focus:bg-blue-50"
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 text-blue-700" aria-hidden="true" />
                {label}
                {active ? (
                  <Check
                    className="ms-auto size-4 text-emerald-700"
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface AvatarColorOption {
  id: string;
  name: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  titleClass: string;
  hex: string;
}

export const AVATAR_PALETTE: Record<string, AvatarColorOption> = {
  indigo: {
    id: "indigo",
    name: "Indigo",
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    dotClass: "bg-indigo-500",
    titleClass: "text-indigo-700",
    hex: "#4338ca",
  },
  emerald: {
    id: "emerald",
    name: "Emerald",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-500",
    titleClass: "text-emerald-700",
    hex: "#047857",
  },
  rose: {
    id: "rose",
    name: "Rose",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    borderClass: "border-rose-200",
    dotClass: "bg-rose-500",
    titleClass: "text-rose-700",
    hex: "#be123c",
  },
  amber: {
    id: "amber",
    name: "Amber",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-200",
    dotClass: "bg-amber-500",
    titleClass: "text-amber-800",
    hex: "#92400e",
  },
  sky: {
    id: "sky",
    name: "Sky",
    bgClass: "bg-sky-50",
    textClass: "text-sky-700",
    borderClass: "border-sky-200",
    dotClass: "bg-sky-500",
    titleClass: "text-sky-700",
    hex: "#0369a1",
  },
  purple: {
    id: "purple",
    name: "Purple",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    dotClass: "bg-purple-500",
    titleClass: "text-purple-700",
    hex: "#7e22ce",
  },
  teal: {
    id: "teal",
    name: "Teal",
    bgClass: "bg-[#E0F7FA]",
    textClass: "text-[#007A91]",
    borderClass: "border-[#0097B2]/30",
    dotClass: "bg-[#0097B2]",
    titleClass: "text-[#007A91]",
    hex: "#007A91",
  },
  violet: {
    id: "violet",
    name: "Violet",
    bgClass: "bg-violet-50",
    textClass: "text-violet-700",
    borderClass: "border-violet-200",
    dotClass: "bg-violet-500",
    titleClass: "text-violet-700",
    hex: "#6d28d9",
  },
  orange: {
    id: "orange",
    name: "Orange",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    dotClass: "bg-orange-500",
    titleClass: "text-orange-700",
    hex: "#c2410c",
  },
};

export const DEFAULT_MANAGER_COLORS: Record<string, string> = {
  JS: "indigo",
  MW: "emerald",
  RM: "rose",
  RA: "amber",
  RP: "sky",
  SR: "purple",
  ZH: "teal",
};

export function getInitials(name: string, sourceCode?: string | null): string {
  if (sourceCode && /^[A-Za-z]{2,3}$/.test(sourceCode.trim())) {
    return sourceCode.trim().toUpperCase();
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "??";
}

export function getManagerColorKey(
  managerId: string,
  sourceCode: string | null | undefined,
  customColors: Record<string, string> = {}
): string {
  if (customColors[managerId] && AVATAR_PALETTE[customColors[managerId]]) {
    return customColors[managerId];
  }
  if (sourceCode && customColors[sourceCode] && AVATAR_PALETTE[customColors[sourceCode]]) {
    return customColors[sourceCode];
  }

  const cleanCode = sourceCode?.slice(0, 2).toUpperCase() || "";
  if (DEFAULT_MANAGER_COLORS[cleanCode] && AVATAR_PALETTE[DEFAULT_MANAGER_COLORS[cleanCode]]) {
    return DEFAULT_MANAGER_COLORS[cleanCode];
  }

  const keys = Object.keys(AVATAR_PALETTE);
  let hash = 0;
  for (let i = 0; i < managerId.length; i++) {
    hash = (hash * 31 + managerId.charCodeAt(i)) >>> 0;
  }
  return keys[hash % keys.length] || "teal";
}

export function getManagerColor(
  managerId: string,
  sourceCode: string | null | undefined,
  customColors: Record<string, string> = {}
): AvatarColorOption {
  const key = getManagerColorKey(managerId, sourceCode, customColors);
  return AVATAR_PALETTE[key] || AVATAR_PALETTE.teal;
}

export function getManagerWorkbookTitle(manager?: { name: string; role_title?: string | null } | null): string {
  if (!manager) return "Leadership actions";
  const role = manager.role_title?.trim();
  if (role) {
    if (role.toLowerCase().endsWith("workbook")) {
      return role;
    }
    return `${role} workbook`;
  }
  return `${manager.name}'s workbook`;
}

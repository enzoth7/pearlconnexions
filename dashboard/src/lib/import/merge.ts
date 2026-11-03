export type WorkbookRow = {
  reference: string;
  workstream: string | null;
  title: string;
  responsibilityType: "Owner" | "Joint owner" | "Collective SMT owner" | "Support";
  manager: string;
  priority: "High" | "Medium" | "Low" | null;
  baseStatus: "Not Started" | "In Progress" | "At Risk";
};

const responsibilityRank = { Owner: 0, "Joint owner": 1, "Collective SMT owner": 2, Support: 3 };
const priorityRank = { High: 3, Medium: 2, Low: 1 };

export function mergeWorkbookRows(rows: WorkbookRow[]) {
  const prefixes = new Map<string, string>();
  rows.forEach((row) => { if (row.workstream && !prefixes.has(row.reference.slice(0, 2))) prefixes.set(row.reference.slice(0, 2), row.workstream); });
  const groups = Map.groupBy(rows, (row) => row.reference);
  return [...groups].map(([reference, matches]) => {
    const ordered = [...matches].sort((a, b) => responsibilityRank[a.responsibilityType] - responsibilityRank[b.responsibilityType]);
    const canonical = ordered[0];
    const priority = [...matches].map((row) => row.priority).filter((value): value is NonNullable<typeof value> => Boolean(value)).sort((a, b) => priorityRank[b] - priorityRank[a])[0] ?? null;
    const baseStatus = matches.some((row) => row.baseStatus === "At Risk") ? "At Risk" : matches.some((row) => row.baseStatus === "In Progress") ? "In Progress" : "Not Started";
    return {
      reference,
      title: reference === "QA02" ? "Identify a focused set of meaningful KPIs across each leadership area." : canonical.title,
      workstream: canonical.workstream ?? prefixes.get(reference.slice(0, 2)) ?? "Unassigned",
      priority: reference === "QA02" ? "High" : priority,
      baseStatus,
      participants: matches.map((row) => ({ manager: row.manager, type: row.responsibilityType, responsibility: row.title })),
    };
  });
}

import type { QaReportRow } from "@/components/qa-reports-list";
import type { GovernanceRecord, Question, RecordKind, ReportBody } from "@/lib/governance";
import type { Home } from "@/lib/types";

export const showQaFixtures = () => process.env.NODE_ENV === "development";
const reportHomes = ["Brambles Acre", "Coulsdon", "Milne Park"];
const reportStatuses = ["submitted", "approved", "submitted"] as const;
const reportScores = [14 / 15, 12 / 13, 14 / 15];

export function localReportHomeId(id: string) {
  return id.startsWith("local-report-") ? id.slice("local-report-".length) : null;
}

export function withLocalReports(rows: QaReportRow[]): QaReportRow[] {
  if (!showQaFixtures()) return rows;
  return rows.map(row => {
    const index = reportHomes.indexOf(row.home);
    if (index < 0 || row.month !== "2026-10" || row.status !== "draft") return row;
    return { ...row, id: `local-report-${row.homeId}`, status: reportStatuses[index], checklist: reportScores[index] };
  });
}

export function localReportBody(questions: Question[], home: Home): ReportBody {
  const index = reportHomes.indexOf(home.name);
  const relevant = questions.filter(question => !question.provisions.length || question.provisions.includes(home.provision));
  const answers = Object.fromEntries(relevant.map((question, position) => {
    const answer: "no" | "na" | "yes" = position === index + 2 ? "no" : position === index + 5 ? "na" : "yes";
    const note = answer === "no" ? "Follow-up action assigned and scheduled for the next review."
      : answer === "na" ? "This check does not apply to this service this month." : "";
    return [question.code, { answer, note }];
  }));
  return { answers, occupied_beds: ["2", "3", "1"][Math.max(index, 0)], records_confirmed: true };
}

type HomeRef = Pick<Home, "id" | "name">;
type Seed = {
  kind: RecordKind; home: string; title: string; date: string; status: string;
  description: string; category?: string; priority?: string; location?: string;
  owner?: string; due?: string; action?: string; controls?: string; followUp?: string;
};
const seeds: Seed[] = [
  { kind: "audits", home: "Brambles Acre", title: "Monthly safety and records audit", date: "2026-10-25", status: "Open", description: "Fire records and daily notes reviewed; one follow-up action remains.", category: "Coordinator", owner: "Mike Wright", due: "2026-11-10", action: "Update the weekly fire drill record.", controls: "Fire checks completed." },
  { kind: "audits", home: "Coulsdon", title: "Operations review", date: "2026-10-29", status: "Closed", description: "Rota, handovers and property checks reviewed.", category: "Operations", owner: "Renee Minott", action: "All findings resolved." },
  { kind: "incidents", home: "Brambles Acre", title: "Slip in communal hallway", date: "2026-10-12", status: "Monitoring", description: "A resident slipped near the entrance. No injury was reported.", category: "Slip or fall", priority: "Low", location: "Entrance", owner: "Mike Wright", action: "Area checked and the loose mat removed.", followUp: "Monitor the entrance after replacement mat is fitted." },
  { kind: "incidents", home: "Coulsdon", title: "Medication record discrepancy", date: "2026-10-18", status: "Follow up", description: "A chart entry required clarification during the evening handover.", category: "Medication", priority: "Moderate", owner: "Renee Minott", action: "Records checked and the shift lead informed.", followUp: "Review the recording process at the next team meeting." },
  { kind: "risks", home: "Brambles Acre", title: "DEMO: Individual absence risk", date: "2026-10-13", status: "Open", description: "Fictional individual risk for Example person. Not a live assessment.", category: "Missing / absence", priority: "Moderate", owner: "Example manager", due: "2026-11-08", controls: "Agreed check-ins and individual response plan.", action: "Review the individual support arrangements." },
  { kind: "risks", home: "Coulsdon", title: "DEMO: Individual medication support risk", date: "2026-10-21", status: "Open", description: "Fictional individual risk for Example person. Not a live assessment.", category: "Medication", priority: "Moderate", owner: "Example manager", due: "2026-11-12", controls: "Staff follow the agreed medication support plan.", action: "Review the individual support arrangements." },
  { kind: "risks", home: "Milne Park", title: "DEMO: Individual wellbeing risk", date: "2026-10-24", status: "Open", description: "Fictional individual risk for Example person. Not a live assessment.", category: "Health / wellbeing", priority: "High", owner: "Example manager", due: "2026-11-07", controls: "Agreed support sessions and early warning signs reviewed.", action: "Review the individual support arrangements." },
  { kind: "maintenance", home: "Brambles Acre", title: "Replace entrance mat", date: "2026-10-14", status: "In progress", description: "Fit a non-slip mat at the main entrance.", location: "Entrance", priority: "High", owner: "Maintenance", due: "2026-11-08", followUp: "Replacement ordered." },
  { kind: "maintenance", home: "Coulsdon", title: "Adjust garden gate latch", date: "2026-10-22", status: "Reported", description: "Garden gate latch does not close smoothly.", location: "Garden", priority: "Moderate", owner: "Maintenance", due: "2026-11-12" },
  { kind: "maintenance", home: "Milne Park", title: "Repair external pathway light", date: "2026-10-25", status: "Awaiting external", description: "Exterior light requires an electrician.", location: "Front path", priority: "High", owner: "Maintenance", due: "2026-11-07", followUp: "Electrician contacted for inspection." },
];

export function localRecords(kind: RecordKind, homes: HomeRef[]): GovernanceRecord[] {
  if (!showQaFixtures()) return [];
  return seeds.flatMap((seed, index) => {
    const home = homes.find(item => item.name === seed.home);
    if (seed.kind !== kind || !home) return [];
    return [{
      id: `local-${seed.kind}-${index}`, version: 1, created_at: `${seed.date}T09:00:00Z`,
      kind: seed.kind, home_id: home.id, occurred_on: seed.date, title: seed.title, status: seed.status,
      data: {
        description: seed.description, category: seed.category ?? "", priority: seed.priority ?? "",
        location: seed.location ?? "", owner: seed.owner ?? "", due_on: seed.due ?? "",
        controls: seed.controls ?? "", action_taken: seed.action ?? "", follow_up: seed.followUp ?? "",
        checks: seed.kind === "audits" ? "Records, safety checks and staffing reviewed." : "",
        workbook_action_id: "", physical_intervention: false, reported_within_24h: true,
      },
    }];
  });
}

import { requireSection } from "@/lib/auth";
import { ActivityLogTable } from "./activity-log-table";

type ActivityEvent = {
  event_id: string;
  occurred_at: string;
  user_name: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE" | "LOGIN";
  record_label: string;
};

type LoginUser = {
  manager_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  last_sign_in_at: string | null;
  sign_in_count: number;
};

const resourceNames: Record<string, string> = {
  actions: "action",
  action_participants: "action participant",
  action_updates: "action update",
  action_signoffs: "action sign-off",
  profiles: "user profile",
  managers: "team member",
  workspace_access: "user permissions",
  workstreams: "workstream",
  qa_homes: "house",
  qa_members: "Quality & Governance access",
  qa_member_homes: "home assignment",
  qa_periods: "reporting period",
  qa_submissions: "monthly report",
  qa_records: "governance record",
};

function describeEvent(event: ActivityEvent) {
  if (event.operation === "LOGIN") return "Signed in";
  const verb = event.operation === "INSERT" ? "Created" : event.operation === "UPDATE" ? "Updated" : "Deleted";
  const resource = resourceNames[event.table_name] ?? "record";
  return `${verb} ${resource}${event.record_label ? ` · ${event.record_label}` : ""}`;
}

export default async function ActivityLogPage() {
  const { supabase } = await requireSection("settings.activity_log");
  const { data, error } = await supabase.rpc("get_activity_log");
  if (error) throw new Error(error.message);

  const payload = data as { as_of?: string; events?: ActivityEvent[]; users?: LoginUser[] } | null;
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const users = Array.isArray(payload?.users) ? payload.users : [];
  const recentThreshold = new Date(payload?.as_of ?? "1970-01-01T00:00:00Z").getTime() - 7 * 24 * 60 * 60 * 1000;
  const rows = [
    ...events.map(event => ({ id: event.event_id, occurredAt: event.occurred_at, user: event.user_name, action: describeEvent(event) })),
    ...users.filter(user => !user.user_id || !user.last_sign_in_at || !events.some(event => event.operation === "LOGIN" && event.user_name === user.name)).map(user => ({
      id: `user:${user.manager_id}`,
      occurredAt: user.last_sign_in_at,
      user: user.name,
      action: !user.user_id ? "No login account" : !user.last_sign_in_at ? "Never signed in"
        : new Date(user.last_sign_in_at).getTime() < recentThreshold ? "Last signed in · over 7 days ago" : "Last signed in",
    })),
  ].sort((a, b) => (b.occurredAt ? new Date(b.occurredAt).getTime() : 0) - (a.occurredAt ? new Date(a.occurredAt).getTime() : 0));

  return <div className="space-y-6">
    <header>
      <h1 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950">Activity log</h1>
      <p className="mt-2 text-sm text-slate-600">Sign-ins and recorded changes across the workspace, in UK time. Earlier sign-ins appear as “Last signed in”.</p>
    </header>
    <section aria-label="Activity log" className="space-y-3">
      <ActivityLogTable rows={rows} />
      <p className="text-xs text-slate-500">Shows the latest 200 recorded events and the last known sign-in for anyone without a recorded login event. Viewing a page without changing data is not recorded.</p>
    </section>
  </div>;
}

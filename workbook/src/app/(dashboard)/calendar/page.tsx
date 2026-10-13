import { PageHeader } from "@/components/app-shell";
import { ActionCalendar } from "@/components/action-calendar";
import { getActions, getManagers, requireAuth } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [auth, actions, managers] = await Promise.all([
    requireAuth(),
    getActions(),
    getManagers(),
  ]);
  const currentManager = auth.isManager
    ? managers.find((manager) => manager.id === auth.managerId)
    : null;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date());

  const description = auth.isManager
    ? "Your deadlines, reviews and completed work."
    : "Deadlines, reviews and completed work across all actions.";

  return (
    <>
      <PageHeader title="Calendar" description={description} />
      <ActionCalendar
        actions={actions}
        today={today}
        fixedManager={currentManager ? {
          id: currentManager.id,
          label: `${currentManager.source_code?.trim().toUpperCase() || "—"} · ${currentManager.name}`,
        } : undefined}
      />
    </>
  );
}

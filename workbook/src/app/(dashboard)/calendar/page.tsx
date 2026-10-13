import { PageHeader } from "@/components/app-shell";
import { ActionCalendar } from "@/components/action-calendar";
import { getActions, requireAuth } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [{ isManager }, actions] = await Promise.all([
    requireAuth(),
    getActions(),
  ]);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date());

  const description = isManager
    ? "Deadlines, reviews and completed work across your reporting line."
    : "Deadlines, reviews and completed work across all actions.";

  return (
    <>
      <PageHeader title="Calendar" description={description} />
      <ActionCalendar actions={actions} today={today} />
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  X,
} from "lucide-react";
import type { ActionRecord } from "@/lib/utils";

type CalendarEventKind = "deadline" | "next-review" | "review" | "completed";

type CalendarEvent = {
  id: string;
  actionId: string;
  date: string;
  kind: CalendarEventKind;
  reference: string;
  title: string;
  manager: string;
  managerCodes: string;
  managerIds: string[];
  priority: string;
  workstream: string;
};

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const eventStyles: Record<CalendarEventKind, string> = {
  deadline: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  "next-review": "border-cyan-200 bg-cyan-50 text-[#007A91] hover:bg-cyan-100",
  review: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
};

const eventLabels: Record<CalendarEventKind, string> = {
  deadline: "Deadline",
  "next-review": "Next review",
  review: "Review",
  completed: "Completed",
};

function isoDate(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function relationRows<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function managerCode(name: string, sourceCode?: string | null) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return sourceCode?.trim().toUpperCase() || initials || "—";
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function makeCalendarEvents(actions: ActionRecord[]) {
  const events = new Map<string, CalendarEvent>();

  const addEvent = (
    action: ActionRecord,
    kind: CalendarEventKind,
    rawDate?: string | null,
    suffix = ""
  ) => {
    const date = isoDate(rawDate);
    if (!date) return;
    const key = `${action.id}:${kind}:${date}:${suffix}`;
    if (events.has(key)) return;
    const participants = relationRows(action.participants);
    const leadParticipants = participants.filter(
      (participant) => participant.responsibility_type !== "Support"
    );
    const owners = leadParticipants.length ? leadParticipants : participants;
    events.set(key, {
      id: key,
      actionId: action.id,
      date,
      kind,
      reference: action.reference,
      title: action.title,
      manager: owners.map((participant) => participant.manager.name).join(", ") || "Unassigned",
      managerCodes:
        owners
          .map((participant) =>
            managerCode(participant.manager.name, participant.manager.source_code)
          )
          .join("/") || "—",
      managerIds: participants.map((participant) => participant.manager.id),
      priority: action.priority || "Unassigned",
      workstream: action.workstream?.name || "Unassigned",
    });
  };

  for (const action of actions) {
    addEvent(action, "deadline", action.extended_deadline || action.deadline);
    const signoffDates = relationRows(action.signoffs)
      .map((signoff) => signoff.signed_off_at)
      .filter(Boolean)
      .sort();
    addEvent(action, "completed", action.completed_at || signoffDates.at(-1));
    for (const update of relationRows(action.updates)) {
      addEvent(action, "review", update.review_date);
      addEvent(action, "next-review", update.next_review_at);
    }
  }

  const order: Record<CalendarEventKind, number> = {
    deadline: 0,
    "next-review": 1,
    review: 2,
    completed: 3,
  };

  return [...events.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]
  );
}

export function isOwnedByManager(action: ActionRecord, managerId: string) {
  return relationRows(action.participants).some(
    (participant) =>
      participant.manager.id === managerId && participant.responsibility_type !== "Support"
  );
}

export function ActionCalendar({ actions, today }: { actions: ActionRecord[]; today: string }) {
  const todayDate = new Date(`${today}T12:00:00Z`);
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: todayDate.getUTCFullYear(),
    month: todayDate.getUTCMonth(),
  }));
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const managers = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; code: string }>();
    for (const action of actions) {
      for (const participant of relationRows(action.participants)) {
        const manager = participant.manager;
        unique.set(manager.id, {
          id: manager.id,
          name: manager.name,
          code: managerCode(manager.name, manager.source_code),
        });
      }
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [actions]);

  const filteredActions = useMemo(
    () =>
      selectedManagerId
        ? actions.filter((action) => isOwnedByManager(action, selectedManagerId))
        : actions,
    [actions, selectedManagerId]
  );

  const events = useMemo(() => makeCalendarEvents(filteredActions), [filteredActions]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const current = grouped.get(event.date) ?? [];
      current.push(event);
      grouped.set(event.date, current);
    }
    return grouped;
  }, [events]);

  const monthPrefix = `${visibleMonth.year}-${String(visibleMonth.month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((event) => event.date.startsWith(monthPrefix));
  const overdueDeadlines = filteredActions.filter((action) => {
    const deadline = isoDate(action.extended_deadline || action.deadline);
    const completed = Boolean(action.completed_at || relationRows(action.signoffs).length);
    return Boolean(deadline && deadline < today && !completed);
  }).length;
  const firstDayOffset =
    (new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay() + 6) % 7;
  const gridStart = new Date(
    Date.UTC(visibleMonth.year, visibleMonth.month, 1 - firstDayOffset)
  );
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return {
      iso: dateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === visibleMonth.month,
    };
  });

  const moveMonth = (amount: number) => {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + amount, 1));
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  const resetCurrentMonth = () => {
    setVisibleMonth({
      year: todayDate.getUTCFullYear(),
      month: todayDate.getUTCMonth(),
    });
  };

  useEffect(() => {
    if (!selectedEvent) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEvent(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedEvent]);

  const mobileDays = calendarDays.filter(
    (day) => day.inMonth && (eventsByDate.get(day.iso)?.length ?? 0) > 0
  );

  return (
    <div className="space-y-4">
      <section aria-label="Calendar summary" className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          icon={CalendarCheck2}
          label="Dates this month"
          value={monthEvents.length}
          tone="bg-cyan-50 text-[#007A91]"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Overdue deadlines"
          value={overdueDeadlines}
          tone="bg-red-50 text-red-700"
        />
      </section>

      <section className="card overflow-hidden" aria-label="Action calendar">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {monthLabel(visibleMonth.year, visibleMonth.month)}
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-600" aria-label="Calendar legend">
              <LegendDot className="bg-red-500" label="Deadline" />
              <LegendDot className="bg-[#0097B2]" label="Next review" />
              <LegendDot className="bg-violet-500" label="Review" />
              <LegendDot className="bg-emerald-500" label="Completed" />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-48 flex-1 sm:flex-none">
              <span className="mb-1 block text-xs font-bold text-slate-600">Manager</span>
              <select
                value={selectedManagerId}
                onChange={(event) => setSelectedManagerId(event.target.value)}
                className="field h-11 min-w-48 py-0"
              >
                <option value="">All managers</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.code} · {manager.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2" aria-label="Calendar navigation">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              onClick={resetCurrentMonth}
              className="btn btn-secondary min-w-28"
              title={`Go to ${monthLabel(todayDate.getUTCFullYear(), todayDate.getUTCMonth())}`}
            >
              {new Intl.DateTimeFormat("en-GB", {
                month: "long",
                timeZone: "UTC",
              }).format(todayDate)}
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight size={19} />
            </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day) => (
              <div key={day} className="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayEvents = eventsByDate.get(day.iso) ?? [];
              const isToday = day.iso === today;
              return (
                <div
                  key={day.iso}
                  className={`min-h-32 border-b border-r border-slate-100 p-2 ${
                    index % 7 === 6 ? "border-r-0" : ""
                  } ${day.inMonth ? "bg-white" : "bg-slate-100"}`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-[#0097B2] text-white"
                          : day.inMonth
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {day.day}
                    </span>
                  </div>
                  <div className="max-h-28 space-y-1 overflow-y-auto pr-0.5">
                    {dayEvents.map((event) => (
                      <CalendarEventButton
                        key={event.id}
                        event={event}
                        compact
                        onSelect={setSelectedEvent}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {mobileDays.length ? (
            mobileDays.map((day) => (
              <div key={day.iso} className="p-4">
                <p className={`mb-3 text-sm font-bold ${day.iso === today ? "text-[#007A91]" : "text-slate-700"}`}>
                  {shortDate(day.iso)}
                </p>
                <div className="space-y-2">
                  {(eventsByDate.get(day.iso) ?? []).map((event) => (
                    <CalendarEventButton
                      key={event.id}
                      event={event}
                      onSelect={setSelectedEvent}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm font-medium text-slate-500">
              No scheduled dates in this month.
            </p>
          )}
        </div>
      </section>
      {selectedEvent ? (
        <EventDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarCheck2;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon aria-hidden="true" size={19} />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function CalendarEventButton({
  event,
  compact = false,
  onSelect,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`block w-full cursor-pointer rounded-md border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0097B2] focus-visible:ring-offset-1 ${eventStyles[event.kind]} ${
        compact ? "px-1.5 py-1" : "p-3"
      }`}
      title={`${event.managerCodes} · ${event.title} — ${eventLabels[event.kind]}`}
    >
      {compact ? (
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-4">
          <span className="shrink-0 font-mono">{event.managerCodes}</span>
          <span aria-hidden="true" className="opacity-45">·</span>
          <span className="truncate">{event.title}</span>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <EventIcon kind={event.kind} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs font-bold">{event.managerCodes}</span>
              <span className="text-xs font-semibold opacity-80">{eventLabels[event.kind]}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{event.title}</p>
            <p className="mt-1 text-xs opacity-75">{event.manager}</p>
          </div>
        </div>
      )}
    </button>
  );
}

function EventDialog({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-title"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${eventStyles[event.kind]}`}
              >
                {eventLabels[event.kind]}
              </span>
              <span className="text-sm font-semibold text-slate-500">{fullDate(event.date)}</span>
            </div>
            <h2 id="calendar-event-title" className="text-xl font-bold leading-7 text-slate-900">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close event details"
          >
            <X size={20} />
          </button>
        </div>

        <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
          <EventDetail label="Manager" value={`${event.managerCodes} · ${event.manager}`} />
          <EventDetail label="Workstream" value={event.workstream} />
          <EventDetail label="Priority" value={event.priority} />
        </dl>

        <div className="mt-6 flex justify-end">
          <Link href={`/actions/${event.actionId}`} className="btn btn-primary" onClick={onClose}>
            <Eye aria-hidden="true" size={17} />
            View action
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function EventIcon({ kind }: { kind: CalendarEventKind }) {
  if (kind === "completed") return <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />;
  if (kind === "deadline") return <CalendarClock aria-hidden="true" className="mt-0.5 shrink-0" size={17} />;
  return <ClipboardCheck aria-hidden="true" className="mt-0.5 shrink-0" size={17} />;
}

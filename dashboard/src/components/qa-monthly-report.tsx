"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checklistScore, reportErrors, saveGovernance, type GovernanceRecord, type Question, type ReportBody } from "@/lib/governance";
import type { Home } from "@/lib/types";

const field = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base focus:outline-2 focus:outline-teal-700";
const sectionClass = "border-t border-slate-300 pt-7";
const questionSections = [
  { number: 1, title: "Team & records" },
  { number: 2, title: "People & support" },
  { number: 3, title: "Safety & property" },
] as const;
const registerKinds = ["incidents", "risks", "maintenance"] as const;

export function QaMonthlyReport({ id, initialVersion, initialStatus, home, month, questions, initialBody, records, director, canEditReport = true, reopenReason, snapshotAt, accessibleRegisters = ["incidents", "risks", "maintenance"] }: {
  id: string; initialVersion: number; initialStatus: string; home: Home; month: string; questions: Question[];
  initialBody: ReportBody; records: GovernanceRecord[]; director: boolean; canEditReport?: boolean;
  reopenReason: string | null; snapshotAt: string | null; accessibleRegisters?: string[];
}) {
  const router = useRouter();
  const relevant = questions.filter(question => !question.provisions.length || question.provisions.includes(home.provision));
  const [body, setBody] = useState<ReportBody>(() => ({
    ...initialBody,
    answers: Object.fromEntries(Object.entries(initialBody.answers).filter(([code]) => relevant.some(question => question.code === code))),
  }));
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();
  const locked = !canEditReport || status === "submitted" || status === "approved";
  const answers = Object.fromEntries(relevant.map(question => [question.code, body.answers[question.code] ?? { answer: "", note: "" }]));
  const score = checklistScore(answers);
  const scoreLabel = relevant.some(question => !answers[question.code].answer) ? "Pending" : score === null ? "Not applicable" : `${Math.round(score * 100)}%`;
  const errors = reportErrors(body, relevant, home.total_beds);

  function updateBody(change: (current: ReportBody) => ReportBody) {
    setBody(change);
    setMessage("");
  }

  function save(operation: "draft" | "submit" | "approve" | "reopen") {
    if (operation === "submit" && errors.length) {
      setShowErrors(true);
      setMessage("Complete the outstanding fields before sending.");
      return;
    }
    setMessage("");
    start(async () => {
      const result = await saveGovernance("/api/governance", { id, version, operation, body, reason });
      setMessage(result.message);
      if (result.ok) {
        setVersion(result.version!);
        if (operation !== "draft") setStatus(operation === "submit" ? "submitted" : operation === "approve" ? "approved" : "reopened");
        router.refresh();
      }
    });
  }

  return <div className="mx-auto max-w-4xl space-y-9 pb-12 text-slate-950">
    <header>
      <Link href={canEditReport ? "/qa/monthly-reports" : "/qa/reviews"} className="inline-flex min-h-11 items-center text-teal-800 underline underline-offset-4">{canEditReport ? "Monthly reports" : "Reviews"}</Link>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{home.name}</h1>
      <p className="mt-2 text-slate-600">{month} · {home.provision} · <span className="capitalize">{status}</span></p>
    </header>

    {reopenReason && status === "reopened" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4">Returned by the director: {reopenReason}</p>}

    <fieldset disabled={locked || pending} className="space-y-10">
      <section className={sectionClass} aria-labelledby="report-home-title">
        <h2 id="report-home-title" className="text-xl font-semibold">Home & occupancy</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-600">Home</dt><dd className="mt-1 font-semibold">{home.name}</dd></div>
          <div><dt className="text-slate-600">Bed capacity</dt><dd className="mt-1 font-semibold">{home.total_beds ?? "Not set"}</dd></div>
        </dl>
        <label className="mt-6 block font-medium">Average occupied beds during the month
          <input className={field} type="number" min="0" max={home.total_beds ?? undefined} step="0.1" value={body.occupied_beds}
            onChange={event => updateBody(current => ({ ...current, occupied_beds: event.target.value }))} />
        </label>
      </section>

      {questionSections.map(section => {
        const sectionQuestions = relevant.filter(question => question.section === section.number);
        if (!sectionQuestions.length) return null;
        return <section key={section.number} className={sectionClass} aria-labelledby={`report-section-${section.number}`}>
          <h2 id={`report-section-${section.number}`} className="text-xl font-semibold">{section.title}</h2>
          <div className="mt-3 divide-y divide-slate-200">{sectionQuestions.map(question => {
            const answer = answers[question.code];
            return <fieldset key={question.code} className="py-5 first:pt-3 last:pb-0">
              <legend className="font-medium leading-relaxed">{question.label}</legend>
              <div className="mt-3 flex flex-wrap gap-2">{(["yes", "no", "na"] as const).map(value =>
                <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50">
                  <input type="radio" name={question.code} value={value} checked={answer.answer === value}
                    onChange={() => updateBody(current => ({ ...current, answers: { ...current.answers, [question.code]: { ...answer, answer: value } } }))}
                    className="size-4 accent-teal-700" />{value === "na" ? "Not applicable" : value === "yes" ? "Yes" : "No"}
                </label>)}</div>
              {answer.answer && answer.answer !== "yes" && <label className="mt-4 block text-sm font-medium">
                {answer.answer === "no" ? "What is outstanding and what happens next?" : "Why does this not apply?"}
                <textarea className={field} rows={2} value={answer.note}
                  onChange={event => updateBody(current => ({ ...current, answers: { ...current.answers, [question.code]: { ...answer, note: event.target.value } } }))} required />
              </label>}
            </fieldset>;
          })}</div>
        </section>;
      })}

      <section className={sectionClass} aria-labelledby="report-registers-title">
        <h2 id="report-registers-title" className="text-xl font-semibold">Registers</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Cases recorded this month, plus earlier risk and maintenance items still open when this report was prepared. {snapshotAt ? "This is the saved copy from submission." : "Check the registers before confirming."}</p>
        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">{registerKinds.map(kind =>
          <div key={kind} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <span className="font-medium capitalize">{kind} <span className="ml-2 text-slate-600">{records.filter(record => record.kind === kind).length}</span></span>
            {accessibleRegisters.includes(kind) && <Link className="inline-flex min-h-10 items-center text-teal-800 underline underline-offset-4" href={kind === "maintenance" ? "/maintenance" : `/qa/${kind}`} target="_blank">Open register</Link>}
          </div>)}</div>
        {records.filter(record => record.kind !== "audits" && accessibleRegisters.includes(record.kind)).map(record =>
          <div className="border-b border-slate-200 py-3" key={record.id}><p className="font-medium">{record.title}</p><p className="text-sm text-slate-600">{record.occurred_on} · {record.status}</p></div>)}
        <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-teal-700" checked={body.records_confirmed}
            onChange={event => updateBody(current => ({ ...current, records_confirmed: event.target.checked }))} />
          I confirm the incident, risk and maintenance registers are complete for this report, including when there were no cases.
        </label>
      </section>
    </fieldset>

    <section className={sectionClass} aria-labelledby="report-review-title">
      <h2 id="report-review-title" className="text-xl font-semibold">Review & send</h2>
      <p className="mt-4 text-sm text-slate-600">Checks met / applicable checks</p>
      <p className="mt-1 text-2xl font-semibold">{scoreLabel}</p>
      {showErrors && (errors.length ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <h3 className="font-semibold">Outstanding fields</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul>
      </div> : <p className="mt-4 text-sm text-teal-800">All required fields are complete.</p>)}
      {message && <p role="status" className="mt-5 text-sm text-slate-700">{message}</p>}
      {!locked && <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={pending} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-medium disabled:opacity-50" onClick={() => save("draft")}>{pending ? "Saving…" : "Save draft"}</button>
        <button type="button" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" onClick={() => save("submit")}>Send to director</button>
      </div>}
    </section>

    {director && locked && <section className={sectionClass} aria-labelledby="report-director-title">
      <h2 id="report-director-title" className="text-xl font-semibold">Director review</h2>
      {status === "submitted" && <button type="button" disabled={pending} onClick={() => save("approve")} className="mt-5 min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50">Approve report</button>}
      <label className="mt-5 block font-medium">Reason for returning the report
        <textarea className={field} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
      </label>
      <button type="button" disabled={pending || reason.trim().length < 5} onClick={() => save("reopen")} className="mt-4 min-h-11 rounded-xl border border-slate-300 bg-white px-5 disabled:opacity-50">Return to manager</button>
    </section>}
  </div>;
}

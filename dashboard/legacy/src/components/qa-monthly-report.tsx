"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checklistScore, reportErrors, saveGovernance, type GovernanceRecord, type Question, type ReportBody } from "@/lib/governance";
import type { Home } from "@/lib/types";
import { measurementErrors, monthlyMeasures } from "@/lib/qa-capture";
import { QaRating } from "./qa-rating";

const field = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base focus:outline-2 focus:outline-teal-700";
const sectionClass = "border-t border-slate-300 pt-7";
const questionSections = [
  { number: 1, title: "Team & records" },
  { number: 2, title: "People & support" },
  { number: 3, title: "Safety & property" },
] as const;
const registerKinds = ["incidents", "risks", "maintenance"] as const;

export function QaMonthlyReport({ id, initialVersion, initialStatus, home, month, questions, initialBody, records, director, canEditReport = true, reopenReason, snapshotAt, accessibleRegisters = ["incidents", "risks", "maintenance"], formVersion = 2 }: {
  id: string; initialVersion: number; initialStatus: string; home: Home; month: string; questions: Question[];
  initialBody: ReportBody; records: GovernanceRecord[]; director: boolean; canEditReport?: boolean;
  reopenReason: string | null; snapshotAt: string | null; accessibleRegisters?: string[];
  formVersion?: number;
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
  const quantityErrors = formVersion >= 3 ? measurementErrors(body.measurements) : {};
  const errors = [...reportErrors(body, relevant, home.total_beds), ...Object.entries(quantityErrors).map(([code, error]) => `${monthlyMeasures.find(m => m.code === code)?.label}: ${error}`)];

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
      <Link href={canEditReport ? "/qa/monthly-reports" : "/qa/reviews"} className="inline-flex min-h-11 items-center text-teal-800 underline underline-offset-4">{canEditReport ? "Reports" : "Reviews"}</Link>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{home.name}</h1>
      <div className="mt-2 text-slate-600">{month} · {home.provision} · <div className="capitalize">{status}</div></div>
    </header>

    {reopenReason && status === "reopened" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">Returned by the director: {reopenReason}</div>}

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
        <div className="mt-3 text-sm text-slate-600">{home.total_beds === null ? "Capacity pending — occupancy percentage is not available." : home.total_beds > 0 && body.occupied_beds.trim() && Number.isFinite(Number(body.occupied_beds)) && Number(body.occupied_beds) >= 0 && Number(body.occupied_beds) <= home.total_beds ? `Average occupancy: ${(Number(body.occupied_beds) / home.total_beds * 100).toFixed(2)}%` : "Enter average occupied beds to calculate occupancy."}</div>
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

      {formVersion >= 3 && <section className={sectionClass} aria-labelledby="monthly-measurements-title"><h2 id="monthly-measurements-title" className="text-xl font-semibold">Monthly quantities</h2><div className="mt-2 text-sm text-slate-600">Count planned obligations completed during this month. Cases in the registers are counted separately. Explain zero expected or not applicable entries.</div><div className="mt-5 space-y-5">{monthlyMeasures.map(measure => {
        const value = body.measurements?.[measure.code] ?? { expected: "", completed: "", na: false, note: "" };
        const change = (patch: Partial<typeof value>) => updateBody(current => ({ ...current, measurements: { ...current.measurements, [measure.code]: { ...value, ...patch } } }));
        const valid = /^\d+$/.test(value.expected) && /^\d+$/.test(value.completed) && Number(value.completed) <= Number(value.expected);
        const ratio = !value.na && valid && Number(value.expected) > 0 ? Number(value.completed) / Number(value.expected) : null;
        return <fieldset key={measure.code} className="rounded-xl border border-slate-200 p-4"><legend className="px-1 font-semibold">{measure.label}</legend><div className="text-sm text-slate-600">{measure.help}</div><div className="mt-3 grid gap-4 sm:grid-cols-2">{(["expected", "completed"] as const).map(key => <label key={key} className="text-sm font-medium" htmlFor={`${measure.code}-${key}`}>{key === "expected" ? "Expected" : "Completed"} ({measure.unit})<input id={`${measure.code}-${key}`} className={field} type="number" min="0" step="1" max={key === "completed" && value.expected ? value.expected : "999999999"} disabled={value.na} value={value[key]} aria-invalid={showErrors && Boolean(quantityErrors[measure.code])} aria-describedby={showErrors && quantityErrors[measure.code] ? `${measure.code}-error` : undefined} onChange={e => change({ [key]: e.target.value })} /></label>)}</div><label className="mt-4 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={value.na} onChange={e => change({ na: e.target.checked })} />Not applicable</label><label className="block text-sm font-medium">Explanation / notes<textarea className={field} rows={2} maxLength={4000} value={value.note} onChange={e => change({ note: e.target.value })} /></label><div className="mt-3"><QaRating ratio={ratio} /></div>{showErrors && quantityErrors[measure.code] && <div id={`${measure.code}-error`} className="mt-2 text-sm text-red-800">{quantityErrors[measure.code]}</div>}</fieldset>;
      })}</div></section>}

      <section className={sectionClass} aria-labelledby="report-registers-title">
        <h2 id="report-registers-title" className="text-xl font-semibold">Registers</h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">Cases recorded this month, plus earlier risk and maintenance items still open when this report was prepared. {snapshotAt ? "This is the saved copy from submission." : "Check the registers before confirming."}</div>
        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">{registerKinds.map(kind =>
          <div key={kind} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <div className="font-medium capitalize">{kind} <div className="ml-2 text-slate-600">{records.filter(record => record.kind === kind).length}</div></div>
            {accessibleRegisters.includes(kind) && <Link className="inline-flex min-h-10 items-center text-teal-800 underline underline-offset-4" href={kind === "maintenance" ? "/maintenance" : `/qa/${kind}`} target="_blank">Open register</Link>}
          </div>)}</div>
        {records.filter(record => record.kind !== "audits" && accessibleRegisters.includes(record.kind)).map(record =>
          <div className="border-b border-slate-200 py-3" key={record.id}><div className="font-medium">{record.title}</div><div className="text-sm text-slate-600">{record.occurred_on} · {record.status}</div></div>)}
        <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-teal-700" checked={body.records_confirmed}
            onChange={event => updateBody(current => ({ ...current, records_confirmed: event.target.checked }))} />
          I confirm the incident, risk and maintenance registers are complete for this report, including when there were no cases.
        </label>
      </section>
    </fieldset>

    <section className={sectionClass} aria-labelledby="report-review-title">
      <h2 id="report-review-title" className="text-xl font-semibold">Review & send</h2>
      <div className="mt-4 text-sm text-slate-600">Checks met / applicable checks</div>
      <div className="mt-2">{scoreLabel === "Pending" ? <div>Pending</div> : <QaRating ratio={score} />}</div>
      <div className="mt-2 text-xs text-slate-600">Internal QA classification, not an official regulator rating. Checklist and quantities measure different things.</div>
      {showErrors && (errors.length ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <h3 className="font-semibold">Outstanding fields</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul>
      </div> : <div className="mt-4 text-sm text-teal-800">All required fields are complete.</div>)}
      {message && <div role="status" className="mt-5 text-sm text-slate-700">{message}</div>}
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

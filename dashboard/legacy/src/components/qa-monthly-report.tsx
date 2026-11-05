"use client";

import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportErrors, saveGovernance, type GovernanceRecord, type Question, type ReportBody } from "@/lib/governance";
import type { Home } from "@/lib/types";
import { measurementErrors, monthlyMeasures } from "@/lib/qa-capture";
import { QaRating } from "./qa-rating";

const field = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base focus:outline-2 focus:outline-teal-700";
const sectionClass = "overflow-hidden rounded-2xl border border-slate-200 bg-white";
const sectionHeader = "qa-report-section-title bg-[#102c39] px-5 py-4 text-lg font-semibold text-white";
const tableHead = "bg-[#102c39] text-left text-sm font-semibold text-white";
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

  return <div className="mx-auto max-w-6xl space-y-6 pb-12 text-slate-950">
    <header>
      <Link href={canEditReport ? "/qa/monthly-reports" : "/qa/reviews"} className="inline-flex min-h-11 items-center text-teal-800 underline underline-offset-4">{canEditReport ? "Reports" : "Reviews"}</Link>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{home.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600"><div>{month} · {home.provision}</div><div className="rounded-full bg-sky-100 px-3 py-1 font-medium capitalize text-sky-900">{status}</div></div>
    </header>

    {reopenReason && status === "reopened" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">Returned by the director: {reopenReason}</div>}

    <fieldset disabled={locked || pending} className="space-y-6">
      <section className={sectionClass} aria-labelledby="report-home-title">
        <h2 id="report-home-title" className={sectionHeader}>Home & occupancy</h2>
        <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_1fr_1.4fr] md:items-end">
          <dl className="text-sm"><dt className="text-slate-600">Home</dt><dd className="mt-1 font-semibold">{home.name}</dd></dl>
          <dl className="text-sm"><dt className="text-slate-600">Bed capacity</dt><dd className="mt-1 font-semibold">{home.total_beds ?? "Not set"}</dd></dl>
          <label className="block text-sm font-medium">Average occupied beds during the month
            <input className={field} type="number" min="0" max={home.total_beds ?? undefined} step="0.1" value={body.occupied_beds}
              onChange={event => updateBody(current => ({ ...current, occupied_beds: event.target.value }))} />
          </label>
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-sm text-slate-600">{home.total_beds === null ? "Capacity pending — occupancy percentage is not available." : home.total_beds > 0 && body.occupied_beds.trim() && Number.isFinite(Number(body.occupied_beds)) && Number(body.occupied_beds) >= 0 && Number(body.occupied_beds) <= home.total_beds ? `Average occupancy: ${(Number(body.occupied_beds) / home.total_beds * 100).toFixed(2)}%` : "Enter average occupied beds to calculate occupancy."}</div>
      </section>

      {questionSections.map(section => {
        const sectionQuestions = relevant.filter(question => question.section === section.number);
        if (!sectionQuestions.length) return null;
        return <section key={section.number} className={sectionClass} aria-labelledby={`report-section-${section.number}`}>
          <h2 id={`report-section-${section.number}`} className={sectionHeader}>{section.title}</h2>
          <table className="qa-report-table w-full table-fixed border-collapse"><colgroup><col className="w-[58%]" /><col className="w-[42%]" /></colgroup><thead className={tableHead}><tr><th scope="col" className="px-5 py-2.5">Check</th><th scope="col" className="px-5 py-2.5">Response</th></tr></thead><tbody className="divide-y divide-slate-200">{sectionQuestions.map(question => {
            const answer = answers[question.code];
            return <Fragment key={question.code}><tr><th scope="row" className="px-5 py-3 text-left text-sm font-medium leading-snug">{question.label}</th><td className="px-5 py-2"><fieldset><legend className="sr-only">{question.label}</legend><div className="flex flex-wrap gap-1.5">{(["yes", "no", "na"] as const).map(value =>
                <label key={value} className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50">
                  <input type="radio" name={question.code} value={value} checked={answer.answer === value}
                    onChange={() => updateBody(current => ({ ...current, answers: { ...current.answers, [question.code]: { ...answer, answer: value } } }))}
                    className="size-4 accent-teal-700" />{value === "na" ? "N/A" : value === "yes" ? "Yes" : "No"}
                </label>)}</div></fieldset></td></tr>
              </Fragment>;
          })}</tbody></table>
        </section>;
      })}

      {formVersion >= 3 && <section className={sectionClass} aria-labelledby="monthly-measurements-title"><h2 id="monthly-measurements-title" className={sectionHeader}>Monthly quantities</h2><div className="px-5 py-3 text-sm text-slate-600">Count planned obligations completed during this month. Cases in the registers are counted separately. Explain zero expected or not applicable entries.</div><table className="qa-report-table w-full table-fixed border-collapse"><colgroup><col className="w-[37%]" /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[13%]" /><col className="w-[14%]" /></colgroup><thead className={tableHead}><tr><th scope="col" className="px-3 py-2.5 text-left sm:px-5">Obligation</th><th scope="col" className="px-2 py-2.5 text-left">Expected</th><th scope="col" className="px-2 py-2.5 text-left">Completed</th><th scope="col" className="px-2 py-2.5 text-center">N/A</th><th scope="col" className="px-2 py-2.5 text-center">Result</th></tr></thead><tbody className="divide-y divide-slate-200">{monthlyMeasures.map(measure => {
        const value = body.measurements?.[measure.code] ?? { expected: "", completed: "", na: false, note: "" };
        const change = (patch: Partial<typeof value>) => updateBody(current => ({ ...current, measurements: { ...current.measurements, [measure.code]: { ...value, ...patch } } }));
        const valid = /^\d+$/.test(value.expected) && /^\d+$/.test(value.completed) && Number(value.completed) <= Number(value.expected);
        const ratio = !value.na && valid && Number(value.expected) > 0 ? Number(value.completed) / Number(value.expected) : null;
        const noteVisible = value.na || value.expected === "0";
        return <Fragment key={measure.code}><tr><th scope="row" className="px-3 py-3 text-left text-sm font-medium leading-snug sm:px-5">{measure.label}<small className="mt-0.5 block font-normal text-slate-500">{measure.help}</small>{showErrors && quantityErrors[measure.code] && <div id={`${measure.code}-error`} className="mt-1 font-normal text-red-800">{quantityErrors[measure.code]}</div>}</th>{(["expected", "completed"] as const).map(key => <td key={key} className="px-2 py-2"><label className="sr-only" htmlFor={`${measure.code}-${key}`}>{key === "expected" ? "Expected" : "Completed"} ({measure.unit})</label><input id={`${measure.code}-${key}`} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-2 focus:outline-teal-700" type="number" min="0" step="1" max={key === "completed" && value.expected ? value.expected : "999999999"} disabled={value.na} value={value[key]} aria-invalid={showErrors && Boolean(quantityErrors[measure.code])} aria-describedby={showErrors && quantityErrors[measure.code] ? `${measure.code}-error` : undefined} onChange={e => change({ [key]: e.target.value })} /></td>)}<td className="px-2 py-2 text-center"><label className="inline-flex min-h-10 items-center justify-center"><input className="size-4 accent-teal-700" type="checkbox" checked={value.na} onChange={e => change({ na: e.target.checked })} aria-label={`${measure.label} not applicable`} /></label></td><td className="px-2 py-2 text-center"><QaRating ratio={ratio} /></td></tr>{noteVisible && <tr><td colSpan={5} className="px-3 pb-3 sm:px-5"><label className="block text-xs font-medium text-slate-600">{value.na ? "Why does this not apply?" : "Why were none expected?"}<input className="mt-1 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus:outline-2 focus:outline-teal-700" maxLength={4000} value={value.note} onChange={e => change({ note: e.target.value })} /></label></td></tr>}</Fragment>;
      })}</tbody></table></section>}

      <section className={sectionClass} aria-labelledby="report-registers-title">
        <h2 id="report-registers-title" className={sectionHeader}>Registers</h2>
        <div className="px-5 py-3 text-sm leading-relaxed text-slate-600">Cases recorded this month, plus earlier risk and maintenance items still open when this report was prepared. {snapshotAt ? "This is the saved copy from submission." : "Check the registers before confirming."}</div>
        <table className="qa-report-table w-full table-fixed border-collapse"><thead className={tableHead}><tr><th scope="col" className="px-5 py-2 text-left">Register</th><th scope="col" className="px-5 py-2 text-center">Cases</th><th scope="col" className="px-5 py-2 text-right">View</th></tr></thead><tbody className="divide-y divide-slate-200">{registerKinds.map(kind => <tr key={kind}><th scope="row" className="px-5 py-2 text-left text-sm font-medium capitalize">{kind}</th><td className="px-5 py-2 text-center text-sm">{records.filter(record => record.kind === kind).length}</td><td className="px-5 py-2 text-right">{accessibleRegisters.includes(kind) && <Link className="inline-flex min-h-9 items-center text-sm text-teal-800 underline underline-offset-4" href={kind === "maintenance" ? "/maintenance" : `/qa/${kind}`} target="_blank">Open register</Link>}</td></tr>)}</tbody></table>
        {records.some(record => record.kind !== "audits" && accessibleRegisters.includes(record.kind)) && <details className="border-t border-slate-200 px-5 py-3 text-sm"><summary className="cursor-pointer font-medium">View recorded cases</summary><div className="mt-2 divide-y divide-slate-200">{records.filter(record => record.kind !== "audits" && accessibleRegisters.includes(record.kind)).map(record => <div className="py-2" key={record.id}><strong>{record.title}</strong><div className="text-slate-600">{record.occurred_on} · {record.status}</div></div>)}</div></details>}
        <label className="flex items-start gap-3 border-t border-slate-200 px-5 py-4 text-sm leading-relaxed">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-teal-700" checked={body.records_confirmed}
            onChange={event => updateBody(current => ({ ...current, records_confirmed: event.target.checked }))} />
          I confirm the incident, risk and maintenance registers are complete for this report, including when there were no cases.
        </label>
      </section>
    </fieldset>

    {showErrors && errors.length > 0 && <div className="rounded-xl border border-amber-200 bg-white p-4 text-sm">
        <h3 className="font-semibold">Outstanding fields</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map(error => <li key={error}>{error}</li>)}</ul>
    </div>}
    {!locked && <div className="flex flex-wrap gap-3">
        <button type="button" disabled={pending} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-medium disabled:opacity-50" onClick={() => save("draft")}>{pending ? "Saving…" : "Save draft"}</button>
        <button type="button" disabled={pending} className="min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50" onClick={() => save("submit")}>Send to director</button>
    </div>}
    {message && <div role="status" className="text-sm text-slate-700">{message}</div>}

    {director && locked && <section className={sectionClass} aria-labelledby="report-director-title">
      <h2 id="report-director-title" className={sectionHeader}>Director review</h2>
      <div className="px-5 pb-5">
      {status === "submitted" && <button type="button" disabled={pending} onClick={() => save("approve")} className="mt-5 min-h-11 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50">Approve report</button>}
      <label className="mt-5 block font-medium">Reason for returning the report
        <textarea className={field} rows={3} value={reason} onChange={event => setReason(event.target.value)} />
      </label>
      <button type="button" disabled={pending || reason.trim().length < 5} onClick={() => save("reopen")} className="mt-4 min-h-11 rounded-xl border border-slate-300 bg-white px-5 disabled:opacity-50">Return to manager</button>
      </div>
    </section>}
  </div>;
}

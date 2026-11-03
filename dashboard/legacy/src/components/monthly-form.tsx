"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bed,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  HeartHandshake,
  Loader2,
  Lock,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { saveDraft, submitSubmission, type ActionState } from "@/app/actions";
import { IncidentEditor } from "@/components/incident-editor";
import { StatusBadge } from "@/components/status-badge";
import { formatPeriodLabel } from "@/lib/periods";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Home, IncidentDetail, MetricDefinition, MetricValue, Period, Submission } from "@/lib/types";

const initial: ActionState = {};
const sectionOrder = ["audit", "operations", "incidents", "risk"] as const;
const sectionConfig = {
  audit: { label: "Audit", icon: ClipboardCheck },
  operations: { label: "Operations", icon: Activity },
  incidents: { label: "Incidents", icon: AlertCircle },
  risk: { label: "Risk", icon: ShieldAlert },
} as const;

function sectionFor(code: string) {
  if (code.startsWith("Inc_")) return "incidents";
  if (code.startsWith("Risk_")) return "risk";
  if (code === "Total_Beds" || code === "Beds_Occ" || code === "Occupancy_Rates") return "operations";
  return "audit";
}

function getAuditGroup(def: MetricDefinition): "Staff" | "Compliance" | "Young People" | "Safety & Inspections" {
  if (def.category === "Staff") return "Staff";
  if (def.category === "Young People") return "Young People";
  if (def.category === "Safety" || def.category === "Maintenance") return "Safety & Inspections";
  return "Compliance";
}

const AUDIT_GROUPS = [
  { key: "Staff", label: "Staff", icon: Users },
  { key: "Compliance", label: "Compliance", icon: CheckSquare },
  { key: "Young People", label: "Young People", icon: HeartHandshake },
  { key: "Safety & Inspections", label: "Safety & Inspections", icon: ShieldCheck },
] as const;

const subscribeToHydration = () => () => {};

export function MonthlyForm({
  submission,
  home,
  period,
  definitions,
  values,
  incidents,
}: {
  submission: Submission;
  home: Home;
  period: Period;
  definitions: MetricDefinition[];
  values: MetricValue[];
  incidents: IncidentDetail[];
}) {
  const editable = submission.status === "draft" || submission.status === "reopened";
  const [dirty, setDirty] = useState(false);
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  const valueMap = useMemo(() => new Map(values.map((value) => [value.metric_code, value])), [values]);
  const inputs = useMemo(() => definitions.filter((definition) => definition.value_kind !== "derived"), [definitions]);

  const [metricInputs, setMetricInputs] = useState<Record<string, { expected: string; actual: string }>>(() =>
    Object.fromEntries(
      inputs.map((definition) => {
        const value = valueMap.get(definition.code);
        return [
          definition.code,
          {
            expected: value?.expected === null || value?.expected === undefined ? "" : String(value.expected),
            actual: value?.actual === null || value?.actual === undefined ? "" : String(value.actual),
          },
        ];
      }),
    ),
  );

  const [saveState, saveAction, saving] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await saveDraft(previous, formData);
    if (result.ok) setDirty(false);
    return result;
  }, initial);

  const [submitState, submitAction, submitting] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await submitSubmission(previous, formData);
    if (result.ok) setDirty(false);
    return result;
  }, initial);

  const version = saveState.version ?? submission.version;
  const progress = inputs.length
    ? Math.round(
        (inputs.filter((definition) => {
          const value = metricInputs[definition.code];
          return value?.actual !== "" && (!definition.requires_expected || value?.expected !== "");
        }).length /
          inputs.length) *
          100,
      )
    : 0;

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const message = submitState.message || saveState.message;
  const messageOk = submitState.message ? submitState.ok : saveState.ok;
  const totalIncidents = Number(metricInputs.Inc_Total?.actual || 0);
  const breakdownTooHigh = definitions.some(
    (definition) =>
      definition.code.startsWith("Inc_") &&
      definition.code !== "Inc_Total" &&
      Number(metricInputs[definition.code]?.actual || 0) > totalIncidents,
  );

  function updateMetric(code: string, field: "expected" | "actual", value: string) {
    setMetricInputs((current) => ({
      ...current,
      [code]: { ...current[code], [field]: value },
    }));
  }

  const syncIncidentMetrics = useCallback((summary: Record<string, number>) => {
    setMetricInputs((current) => {
      const next = { ...current };
      for (const [code, value] of Object.entries(summary)) {
        if (next[code]) next[code] = { ...next[code], actual: String(value) };
      }
      return next;
    });
    setDirty(true);
  }, []);

  function getDerivedValue(code: string): string {
    if (code === "Occupancy_Rates") {
      const beds = Number(metricInputs.Total_Beds?.actual);
      const occ = Number(metricInputs.Beds_Occ?.actual);
      if (beds > 0 && metricInputs.Beds_Occ?.actual !== "" && !isNaN(occ) && !isNaN(beds)) {
        return new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(occ / beds);
      }
    } else if (code === "Tasks_Pct") {
      let expectedTotal = 0;
      let actualTotal = 0;
      for (const def of definitions) {
        if (sectionFor(def.code) === "audit" && def.value_kind !== "derived") {
          const inp = metricInputs[def.code];
          if (inp && inp.actual !== "" && inp.expected !== "") {
            const exp = Number(inp.expected);
            const act = Number(inp.actual);
            if (exp > 0 && !isNaN(exp) && !isNaN(act)) {
              expectedTotal += exp;
              actualTotal += act;
            }
          }
        }
      }
      if (expectedTotal > 0) {
        return new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(
          actualTotal / expectedTotal,
        );
      }
    }

    const stored = valueMap.get(code);
    if (stored?.actual !== null && stored?.actual !== undefined) {
      return new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(stored.actual);
    }
    return "—";
  }

  function renderMetricRow(definition: MetricDefinition) {
    const isDerived = definition.value_kind === "derived";

    return (
      <tr
        key={definition.code}
        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors group"
      >
        <td className="py-2.5 px-4 align-middle">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">{definition.display_name}</span>
              {isDerived && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Derived
                </span>
              )}
            </div>
            {definition.description ? (
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{definition.description}</p>
            ) : null}
          </div>
        </td>
        <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
          {isDerived ? (
            <span className="text-slate-300 font-mono text-sm select-none">—</span>
          ) : definition.requires_expected ? (
            <input
              id={`metric_${definition.code}_expected`}
              name={`metric_${definition.code}_expected`}
              type="number"
              min="0"
              step="any"
              placeholder="0"
              aria-label={`${definition.display_name} expected`}
              value={metricInputs[definition.code]?.expected ?? ""}
              onChange={(event) => updateMetric(definition.code, "expected", event.target.value)}
              disabled={!editable}
              className="h-8.5 w-24 sm:w-28 text-right font-mono text-sm px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xs transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          ) : (
            <span className="text-slate-300 font-mono text-sm select-none">—</span>
          )}
        </td>
        <td className="py-2.5 px-4 align-middle text-right whitespace-nowrap">
          {isDerived ? (
            <div className="inline-flex items-center justify-end font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {getDerivedValue(definition.code)}
            </div>
          ) : (
            <input
              id={`metric_${definition.code}_actual`}
              name={`metric_${definition.code}_actual`}
              type="number"
              min="0"
              step="any"
              placeholder="0"
              aria-label={`${definition.display_name} actual`}
              value={metricInputs[definition.code]?.actual ?? ""}
              onChange={(event) => updateMetric(definition.code, "actual", event.target.value)}
              disabled={!editable}
              className="h-8.5 w-24 sm:w-28 text-right font-mono text-sm px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xs transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          )}
        </td>
      </tr>
    );
  }

  return (
    <form action={saveAction} onInput={() => setDirty(true)} className="space-y-6">
      <input type="hidden" name="submission_id" value={submission.id} />
      <input type="hidden" name="version" value={version} />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">{home.name}</CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                {home.provision} ·{" "}
                {formatPeriodLabel(period)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={submission.status} />
              {!editable ? <Lock className="size-4 text-muted-foreground" aria-label="Locked" /> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-0 sm:grid-cols-[220px_1fr] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="audit_date" className="text-sm font-semibold text-slate-700">
              Audit date
            </Label>
            <Input
              id="audit_date"
              name="audit_date"
              type="date"
              defaultValue={submission.audit_date ?? ""}
              disabled={!editable}
              required
              className="h-10 rounded-lg border-slate-200"
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Form progress</span>
              <span className="font-mono font-semibold text-slate-900">{progress}%</span>
            </div>
            <Progress value={progress} aria-label={`Form ${progress}% complete`} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {submission.status === "reopened" && submission.reopen_reason ? (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="text-amber-800" />
          <AlertTitle>Reopened by Joel</AlertTitle>
          <AlertDescription>{submission.reopen_reason}</AlertDescription>
        </Alert>
      ) : null}
      {!editable ? (
        <Alert>
          <Lock />
          <AlertTitle>This report is locked</AlertTitle>
          <AlertDescription>
            Submitted information can be reopened only by Joel. You can still review every value.
          </AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant={messageOk ? "default" : "destructive"}>
          {messageOk ? <CheckCircle2 /> : <AlertTriangle />}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {breakdownTooHigh ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>An incident breakdown cannot exceed Total Incidents.</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 p-1.5 rounded-xl border border-slate-200 bg-slate-100/90 shadow-xs sm:grid-cols-4 sm:h-12">
          {sectionOrder.map((section) => {
            const { label, icon: Icon } = sectionConfig[section];
            const count = definitions.filter((definition) => sectionFor(definition.code) === section).length;
            return (
              <TabsTrigger
                key={section}
                value={section}
                className="min-h-10 text-sm font-semibold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-[#0b2a52] data-[state=active]:shadow-sm cursor-pointer"
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
                <span className="text-xs font-medium text-muted-foreground/80">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sectionOrder.map((section) => {
          const tabDefs = definitions.filter((d) => sectionFor(d.code) === section);

          // For operations, order Total_Beds -> Beds_Occ -> Occupancy_Rates
          if (section === "operations") {
            const orderMap: Record<string, number> = { Total_Beds: 1, Beds_Occ: 2, Occupancy_Rates: 3 };
            tabDefs.sort((a, b) => (orderMap[a.code] ?? a.display_order) - (orderMap[b.code] ?? b.display_order));
          } else {
            tabDefs.sort((a, b) => a.display_order - b.display_order);
          }

          return (
            <TabsContent key={section} value={section} className="mt-6 w-full">
              <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] items-start">
                {/* Left Column: task inputs or structured incident records */}
                <div className="min-w-0">
                  {section === "incidents" ? (
                    <IncidentEditor
                      initialIncidents={incidents}
                      editable={editable}
                      onMetricsChange={syncIncidentMetrics}
                    />
                  ) : (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th scope="col" className="py-3 px-4">
                              Metric
                            </th>
                            <th scope="col" className="py-3 px-3 text-right w-28 sm:w-32">
                              Expected
                            </th>
                            <th scope="col" className="py-3 px-4 text-right w-28 sm:w-36">
                              Actual / Value
                            </th>
                          </tr>
                        </thead>
                        {section === "audit" ? (
                          AUDIT_GROUPS.map((group) => {
                            const groupDefs = tabDefs.filter((d) => getAuditGroup(d) === group.key);
                            if (groupDefs.length === 0) return null;
                            const GroupIcon = group.icon;

                            return (
                              <tbody key={`group-${group.key}`} className="divide-y divide-slate-100">
                                <tr className="bg-slate-50/90 border-y border-slate-200/80">
                                  <td colSpan={3} className="py-2.5 px-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <GroupIcon className="size-4 text-slate-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                          {group.label}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                        {groupDefs.length} metrics
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {groupDefs.map((def) => renderMetricRow(def))}
                              </tbody>
                            );
                          })
                        ) : (
                          <tbody className="divide-y divide-slate-100">
                            {tabDefs.map((def) => renderMetricRow(def))}
                          </tbody>
                        )}
                      </table>
                    </div>
                  </div>
                  )}
                </div>

                {/* Right Column: Sticky Live Chart Panel */}
                <div className="lg:sticky lg:top-24 space-y-4">
                  {section === "audit" && (
                    <AuditAnalyticsPanel definitions={definitions} metricInputs={metricInputs} mounted={mounted} />
                  )}
                  {section === "operations" && (
                    <OperationsAnalyticsPanel metricInputs={metricInputs} mounted={mounted} />
                  )}
                  {section === "incidents" && (
                    <IncidentsAnalyticsPanel metricInputs={metricInputs} mounted={mounted} />
                  )}
                  {section === "risk" && <RiskAnalyticsPanel metricInputs={metricInputs} mounted={mounted} />}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {editable ? (
        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {dirty ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-4 shrink-0" />
                You have unsaved changes.
              </span>
            ) : (
              <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="size-4 shrink-0" />
                All saved changes are stored securely.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              className="h-10 flex-1 sm:flex-none border-slate-200 shadow-xs cursor-pointer"
              disabled={saving || submitting}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              type="submit"
              formAction={submitAction}
              className="h-10 flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              disabled={saving || submitting || dirty}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              {submitting ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Right Side Reactive Analytics Panels
// ---------------------------------------------------------------------------

function AuditAnalyticsPanel({
  definitions,
  metricInputs,
  mounted,
}: {
  definitions: MetricDefinition[];
  metricInputs: Record<string, { expected: string; actual: string }>;
  mounted: boolean;
}) {
  const stats = useMemo(() => {
    const groups = ["Staff", "Compliance", "Young People", "Safety & Inspections"] as const;
    const groupScores: Record<string, { actual: number; expected: number; count: number; filled: number }> = {
      Staff: { actual: 0, expected: 0, count: 0, filled: 0 },
      Compliance: { actual: 0, expected: 0, count: 0, filled: 0 },
      "Young People": { actual: 0, expected: 0, count: 0, filled: 0 },
      "Safety & Inspections": { actual: 0, expected: 0, count: 0, filled: 0 },
    };

    const auditDefs = definitions.filter((d) => sectionFor(d.code) === "audit");

    for (const def of auditDefs) {
      if (def.value_kind === "derived") continue;
      const group = getAuditGroup(def);
      const inp = metricInputs[def.code];
      groupScores[group].count++;

      if (inp && inp.actual !== "") {
        groupScores[group].filled++;
        const exp = def.requires_expected && inp.expected !== "" ? Number(inp.expected) : 1;
        const act = Number(inp.actual);
        if (exp > 0 && !isNaN(exp) && !isNaN(act)) {
          groupScores[group].expected += exp;
          groupScores[group].actual += act;
        }
      }
    }

    const chartData = groups.map((grp) => {
      const g = groupScores[grp];
      const score = g.expected > 0 ? Math.min(100, Math.round((g.actual / g.expected) * 100)) : 0;
      const colors: Record<string, string> = {
        Staff: "#3b82f6",
        Compliance: "#10b981",
        "Young People": "#8b5cf6",
        "Safety & Inspections": "#f59e0b",
      };
      return {
        area: grp,
        score,
        filled: g.filled,
        count: g.count,
        fill: colors[grp],
      };
    });

    const totalFilled = Object.values(groupScores).reduce((acc, curr) => acc + curr.filled, 0);
    const totalMetrics = Object.values(groupScores).reduce((acc, curr) => acc + curr.count, 0);
    const totalActual = Object.values(groupScores).reduce((acc, curr) => acc + curr.actual, 0);
    const totalExpected = Object.values(groupScores).reduce((acc, curr) => acc + curr.expected, 0);
    const overallScore = totalExpected > 0 ? Math.min(100, Math.round((totalActual / totalExpected) * 100)) : 0;

    return { chartData, totalFilled, totalMetrics, overallScore };
  }, [definitions, metricInputs]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Audit Compliance</h3>
        <p className="text-xs text-slate-500 mt-0.5">Area progress & score</p>
      </div>

      <div className="h-52 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData} layout="vertical" margin={{ top: 5, right: 25, left: 15, bottom: 5 }}>
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="area"
                tick={{ fontSize: 11, fill: "#334155" }}
                width={85}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val) => [`${val}%`, "Score"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {stats.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading chart...</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Overall Score</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{stats.overallScore}%</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Completed</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {stats.totalFilled} / {stats.totalMetrics}
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-slate-100">
        {stats.chartData.map((cat) => (
          <div key={cat.area} className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">{cat.area}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                ({cat.filled}/{cat.count})
              </span>
              <span className="font-mono font-bold text-slate-800 w-10 text-right">{cat.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationsAnalyticsPanel({
  metricInputs,
  mounted,
}: {
  metricInputs: Record<string, { expected: string; actual: string }>;
  mounted: boolean;
}) {
  const totalBeds = Number(metricInputs.Total_Beds?.actual || 0);
  const occupiedBeds = Number(metricInputs.Beds_Occ?.actual || 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  const chartData = useMemo(
    () => [
      { name: "Occupied Beds", value: occupiedBeds, fill: "#2563eb" },
      { name: "Available Beds", value: availableBeds, fill: "#e2e8f0" },
    ],
    [occupiedBeds, availableBeds],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Capacity & Occupancy</h3>
        <p className="text-xs text-slate-500 mt-0.5">Bed allocation & rate</p>
      </div>

      <div className="relative h-48 w-full flex items-center justify-center">
        {mounted ? (
          totalBeds > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val, name) => [`${val} beds`, name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Pie
                    data={chartData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold font-mono text-slate-900">{occupancyRate.toFixed(1)}%</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Occupancy</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 w-full h-full">
              <Bed className="size-8 text-slate-300 mb-1" />
              <p className="text-xs font-medium text-slate-500">No beds configured</p>
              <p className="text-[11px] text-slate-400">Enter Total Beds and Occupied Beds</p>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading chart...</div>
        )}
      </div>

      {/* Occupancy gauge bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-600">Occupancy Gauge</span>
          <span className="font-mono text-slate-800 font-semibold">{occupancyRate.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              occupancyRate >= 85 ? "bg-emerald-500" : occupancyRate >= 60 ? "bg-blue-600" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, occupancyRate))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-center">
          <span className="text-[10px] font-medium text-slate-500 uppercase">Total</span>
          <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{totalBeds}</p>
        </div>
        <div className="rounded-lg bg-blue-50/50 p-2.5 border border-blue-100 text-center">
          <span className="text-[10px] font-medium text-blue-600 uppercase">Occupied</span>
          <p className="text-base font-bold font-mono text-blue-700 mt-0.5">{occupiedBeds}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-center">
          <span className="text-[10px] font-medium text-slate-500 uppercase">Vacant</span>
          <p className="text-base font-bold font-mono text-slate-900 mt-0.5">{availableBeds}</p>
        </div>
      </div>
    </div>
  );
}

function IncidentsAnalyticsPanel({
  metricInputs,
  mounted,
}: {
  metricInputs: Record<string, { expected: string; actual: string }>;
  mounted: boolean;
}) {
  const totalIncidents = Number(metricInputs.Inc_Total?.actual || 0);

  const breakdown = useMemo(() => {
    const list = [
      { key: "Inc_Assault", label: "Physical Assault", color: "#ef4444" },
      { key: "Inc_Absconding", label: "Absconding", color: "#06b6d4" },
      { key: "Inc_Missing", label: "Missing Person", color: "#8b5cf6" },
      { key: "Inc_SelfHarm", label: "Self Harm", color: "#e11d48" },
      { key: "Inc_Damage", label: "Property Damage", color: "#f97316" },
      { key: "Inc_Overdose", label: "Overdose", color: "#dc2626" },
      { key: "Inc_Verbal", label: "Verbal Abuse", color: "#eab308" },
    ];

    const data = list.map((item) => ({
      name: item.label,
      value: Number(metricInputs[item.key]?.actual || 0),
      color: item.color,
    }));

    const sum = data.reduce((acc, curr) => acc + curr.value, 0);
    const activeData = data.filter((d) => d.value > 0);
    const piCount = Number(metricInputs.Inc_PI_Involved?.actual || 0);
    const rep24h = Number(metricInputs.Inc_Reported_24h?.actual || 0);

    return { data, activeData, sum, piCount, rep24h };
  }, [metricInputs]);

  const matchesTotal = breakdown.sum === totalIncidents && totalIncidents > 0;
  const isOverTotal = breakdown.sum > totalIncidents;
  const isUnderTotal = breakdown.sum < totalIncidents && totalIncidents > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Incident Breakdown</h3>
        <p className="text-xs text-slate-500 mt-0.5">Distribution vs Total</p>
      </div>

      <div className="relative h-48 w-full flex items-center justify-center">
        {mounted ? (
          breakdown.sum > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val, name) => [`${val} incidents`, name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Pie
                    data={breakdown.activeData}
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {breakdown.activeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold font-mono text-slate-900">{breakdown.sum}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Breakdown Sum</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 w-full h-full">
              <AlertCircle className="size-8 text-slate-300 mb-1" />
              <p className="text-xs font-medium text-slate-500">No incident breakdown entered</p>
              <p className="text-[11px] text-slate-400">Values entered in form will appear here</p>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading chart...</div>
        )}
      </div>

      {/* Comparison KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Declared</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{totalIncidents}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Breakdown Sum</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{breakdown.sum}</p>
        </div>
      </div>

      {/* Status indicator */}
      {matchesTotal && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>Breakdown matches declared Total Incidents ({breakdown.sum}/{totalIncidents}).</span>
        </div>
      )}
      {isUnderTotal && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <span>
            {totalIncidents - breakdown.sum} incident(s) unallocated in breakdown ({breakdown.sum} of {totalIncidents}).
          </span>
        </div>
      )}
      {isOverTotal && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
          <span>Breakdown sum ({breakdown.sum}) exceeds Total Incidents ({totalIncidents}).</span>
        </div>
      )}

      {/* Auxiliary incident KPIs */}
      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex justify-between items-center text-slate-600">
          <span>Reported within 24h</span>
          <span className="font-mono font-semibold text-slate-800">
            {breakdown.rep24h} / {totalIncidents}{" "}
            {totalIncidents > 0 ? `(${Math.round((breakdown.rep24h / totalIncidents) * 100)}%)` : ""}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Physical Interventions</span>
          <span className="font-mono font-semibold text-slate-800">{breakdown.piCount}</span>
        </div>
      </div>
    </div>
  );
}

function RiskAnalyticsPanel({
  metricInputs,
  mounted,
}: {
  metricInputs: Record<string, { expected: string; actual: string }>;
  mounted: boolean;
}) {
  const low = Number(metricInputs.Risk_Low?.actual || 0);
  const moderate = Number(metricInputs.Risk_Moderate?.actual || 0);
  const high = Number(metricInputs.Risk_High?.actual || 0);
  const extreme = Number(metricInputs.Risk_Extremely_High?.actual || 0);
  const totalAssessments = Number(metricInputs.Risk_Total_Assessments?.actual || 0);
  const pendingActions = Number(metricInputs.Risk_Actions_Pending?.actual || 0);
  const overdueActions = Number(metricInputs.Risk_Actions_Overdue?.actual || 0);

  const severityData = useMemo(
    () => [
      { name: "Low", value: low, color: "#10b981" },
      { name: "Moderate", value: moderate, color: "#f59e0b" },
      { name: "High", value: high, color: "#f97316" },
      { name: "Extremely High", value: extreme, color: "#ef4444" },
    ],
    [low, moderate, high, extreme],
  );

  const activeSeverity = severityData.filter((d) => d.value > 0);
  const sumSeverity = severityData.reduce((acc, curr) => acc + curr.value, 0);

  const highestRiskLabel =
    extreme > 0
      ? { text: "Extremely High", color: "text-rose-700 bg-rose-50 border-rose-200" }
      : high > 0
      ? { text: "High", color: "text-orange-700 bg-orange-50 border-orange-200" }
      : moderate > 0
      ? { text: "Moderate", color: "text-amber-700 bg-amber-50 border-amber-200" }
      : low > 0
      ? { text: "Low", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
      : { text: "None recorded", color: "text-slate-600 bg-slate-50 border-slate-200" };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Risk Severity Profile</h3>
        <p className="text-xs text-slate-500 mt-0.5">Severity & mitigation actions</p>
      </div>

      <div className="relative h-48 w-full flex items-center justify-center">
        {mounted ? (
          sumSeverity > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val, name) => [`${val} risks`, name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Pie
                    data={activeSeverity}
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activeSeverity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold font-mono text-slate-900">{sumSeverity}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Total Risks</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50/70 rounded-lg border border-dashed border-slate-200 w-full h-full">
              <ShieldAlert className="size-8 text-slate-300 mb-1" />
              <p className="text-xs font-medium text-slate-500">No risk severity counts</p>
              <p className="text-[11px] text-slate-400">Input risk levels to view distribution</p>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading chart...</div>
        )}
      </div>

      {/* Highest Risk Active */}
      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50/70 border-slate-200 text-xs">
        <span className="text-slate-600 font-medium">Highest Severity Active:</span>
        <span className={`px-2 py-0.5 rounded font-semibold border ${highestRiskLabel.color}`}>
          {highestRiskLabel.text}
        </span>
      </div>

      {/* Action KPIs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending Actions</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{pendingActions}</p>
        </div>
        <div
          className={`rounded-lg p-3 border ${
            overdueActions > 0 ? "bg-rose-50/60 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-100"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Overdue Actions</span>
          <p className={`text-xl font-bold font-mono mt-1 ${overdueActions > 0 ? "text-rose-700" : "text-slate-900"}`}>
            {overdueActions}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 text-slate-600">
        <span>Total Risk Assessments:</span>
        <span className="font-mono font-semibold text-slate-800">{totalAssessments}</span>
      </div>
    </div>
  );
}

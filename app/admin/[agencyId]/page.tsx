"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import type { DeploymentViewModel } from "@/lib/deployment-types";
import {
  WORKFLOW_STEPS,
  getDeployment,
  readPsoNotes,
  setPsoMarkedReadyToSchedule,
  writePsoNotes,
} from "@/lib/deployment-repository";

function stepUiStatus(
  stepId: string,
  completed: Set<string>,
  currentStepId: string | null,
): "complete" | "current" | "locked" {
  if (completed.has(stepId)) return "complete";
  if (stepId === currentStepId) return "current";
  return "locked";
}

function statusBadgeClass(status: "complete" | "current" | "locked") {
  if (status === "complete")
    return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (status === "current") return "bg-blue-50 text-blue-800 ring-blue-100";
  return "bg-gray-100 text-gray-600 ring-gray-200";
}

function scheduleStatusLabel(
  status: DeploymentViewModel["scheduleStatus"],
): string {
  if (status === "submitted") return "Submitted";
  if (status === "confirmed") return "Confirmed";
  return "Not scheduled";
}

function computeOutstandingStepLines(row: DeploymentViewModel): string[] {
  const completed = new Set(row.completedStepIds);
  const lines: string[] = [];

  for (const step of WORKFLOW_STEPS) {
    if (completed.has(step.id)) continue;
    lines.push(`Task not yet complete: ${step.title}`);
  }

  return lines;
}

function AdminAgencyDeploymentInner({ agencyId }: { agencyId: string }) {
  const [row, setRow] = useState<DeploymentViewModel | null | undefined>(
    undefined,
  );
  const [notes, setNotes] = useState("");

  const refresh = useCallback(() => {
    setRow(getDeployment(agencyId) ?? null);
    setNotes(readPsoNotes(agencyId));
  }, [agencyId]);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount */
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const outstandingStepLines = useMemo(
    () => (row ? computeOutstandingStepLines(row) : []),
    [row],
  );

  const completedSet = row
    ? new Set(row.completedStepIds)
    : new Set<string>();

  const onsiteWhen =
    row?.onsiteDate || row?.onsiteTime
      ? [row.onsiteDate, row.onsiteTime].filter(Boolean).join(" · ")
      : null;

  if (row === undefined) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-sm text-gray-500" role="status">
          Loading deployment…
        </p>
      </main>
    );
  }

  if (row === null) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-sm text-gray-700">Agency deployment not found.</p>
        <Link
          href="/admin"
          className="mt-4 inline-block text-sm font-medium text-blue-600 underline"
        >
          ← Back to admin
        </Link>
      </main>
    );
  }

  const taskHref = row.currentStepId
    ? `/tasks/${row.currentStepId}?pso=1`
    : "/";
  const canScheduleOnsite = row.readinessPercent === 100;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            href="/admin"
            className="font-medium text-blue-600 underline"
          >
            ← Back to admin
          </Link>
          <Link href="/" className="text-gray-600 underline hover:text-gray-900">
            Customer dashboard
          </Link>
        </div>

        {/* Summary — future: replace with API e.g. GET /admin/agencies/:agencyId/deployment */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Deployment
              </p>
              <h1 className="text-2xl font-bold text-gray-900">
                {row.agencyName}
              </h1>
              <p className="mt-1 text-xs text-gray-500">Agency id: {row.id}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-gray-900">
                {row.readinessPercent}%
              </p>
              <p className="text-xs text-gray-500">Readiness</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Current task
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {row.currentStepTitle}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Remaining tasks
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
                {row.remainingStepCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Schedule status
              </dt>
              <dd className="mt-1 text-sm text-gray-800">
                {scheduleStatusLabel(row.scheduleStatus)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Onsite date &amp; time
              </dt>
              <dd className="mt-1 text-sm text-gray-800">
                {onsiteWhen ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                PSO marked ready to schedule
              </dt>
              <dd className="mt-1 text-sm text-gray-800">
                {row.psoMarkedReadyToSchedule ? "Yes" : "No"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              disabled={row.psoMarkedReadyToSchedule}
              onClick={() => {
                setPsoMarkedReadyToSchedule(agencyId, true);
                refresh();
              }}
              className="inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark customer ready to schedule
            </button>
            {canScheduleOnsite ? (
              <Link
                href="/schedule-onsite"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Schedule onsite
              </Link>
            ) : (
              <span
                className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400"
                title="Requires 100% readiness"
              >
                Schedule onsite
              </span>
            )}
            <Link
              href={taskHref}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Open current task (PSO view)
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">
                Guided tasks
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Order mirrors <code className="text-gray-700">lib/task-workflow-config.ts</code>.
                Status comes from completed task ids.
              </p>
              <ol className="mt-4 space-y-4">
                {WORKFLOW_STEPS.map((step, index) => {
                  const status = stepUiStatus(
                    step.id,
                    completedSet,
                    row.currentStepId,
                  );

                  return (
                    <li
                      key={step.id}
                      className="rounded-lg border border-gray-100 bg-gray-50/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500 ring-1 ring-gray-200">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">
                              {step.title}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-600">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(status)}`}
                        >
                          {status === "complete"
                            ? "Complete"
                            : status === "current"
                              ? "Current"
                              : "Locked"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-amber-950">
                Steps still to complete
              </h2>
              {outstandingStepLines.length === 0 ? (
                <p className="mt-2 text-sm text-amber-900/90">
                  None. All tasks are complete for this view.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm text-amber-950">
                  {outstandingStepLines.map((line, i) => (
                    <li
                      key={`${line}-${i}`}
                      className={line.startsWith("  ·") ? "pl-3" : ""}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">
                PSO internal notes
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Stored in <code className="text-gray-700">localStorage</code>{" "}
                per agency id; replace with API notes on the same resource later.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => writePsoNotes(agencyId, notes)}
                rows={8}
                className="mt-3 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Handoff details, call outcomes, risks…"
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminAgencyDeploymentPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  const { agencyId } = use(params);
  return <AdminAgencyDeploymentInner key={agencyId} agencyId={agencyId} />;
}

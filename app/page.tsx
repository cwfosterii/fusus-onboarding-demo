"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NextActionBanner } from "@/components/tasks/NextActionBanner";
import { TaskProgress } from "@/components/tasks/TaskProgress";
import {
  ALL_TASK_IDS,
  TASKS_ORDERED,
  TOTAL_TASKS,
  getTaskById,
  initialsFromName,
  workflow,
} from "@/lib/task-workflow-config";
import { resetDemo } from "@/lib/demo-reset";
import {
  getCompletedTaskIds,
  getFirstIncompleteTaskId,
  hasWelcomeVideoBeenWatched,
  isAllTasksComplete,
  taskReadinessPercent,
} from "@/lib/task-progress-storage";

export default function Home() {
  const [renderKey, setRenderKey] = useState(0);

  const refresh = useCallback(() => setRenderKey((k) => k + 1), []);

  useEffect(() => {
    const onStorage = () => refresh();
    const onTask = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("fusus-task-progress-updated", onTask);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fusus-task-progress-updated", onTask);
    };
  }, [refresh]);

  const completedIds = getCompletedTaskIds();
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const readiness = taskReadinessPercent();
  const fullyReady = isAllTasksComplete();
  const firstOpen = getFirstIncompleteTaskId();
  const currentTask = firstOpen ? getTaskById(firstOpen) : null;

  const welcomeWatched = hasWelcomeVideoBeenWatched();
  const hasStartedOnboarding =
    welcomeWatched || completedIds.length > 0;
  const bannerCta = hasStartedOnboarding ? "Continue Task" : "Get Started";
  const bannerDescription = hasStartedOnboarding
    ? "Pick up your current task and keep moving through the workflow."
    : "Open your first task to watch the overview and begin onboarding.";

  const completedCount = completedIds.length;
  const remainingCount = TOTAL_TASKS - completedCount;

  const psoInitials = initialsFromName(workflow.pso.name);

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {workflow.agency.name} - Fusus Deployment
            </h1>
            <p className="mt-2 text-gray-600">
              Guided onboarding — one task at a time
            </p>
            <Link
              href="/admin"
              className="mt-2 inline-block text-xs text-gray-500 underline decoration-gray-400/80 underline-offset-2 transition hover:text-gray-700"
            >
              PSO admin
            </Link>
          </div>

          {/* DEMO ONLY: Reset Demo control — remove before production */}
          <aside className="flex w-full shrink-0 flex-col items-end gap-3 lg:ml-6 lg:w-auto lg:max-w-sm">
            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Reset demo: clear all saved local data and reload"
            >
              Reset Demo
            </button>
            <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                Axon POC
              </p>
              <div className="mt-3 flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700"
                  aria-hidden
                >
                  {psoInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{workflow.pso.name}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{workflow.pso.title}</p>
                  <a
                    href={`mailto:${workflow.pso.email}`}
                    className="mt-1 block truncate text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {workflow.pso.email}
                  </a>
                </div>
              </div>
            </div>
          </aside>
          {/* end DEMO ONLY */}
        </header>

        {currentTask && !fullyReady ? (
          <NextActionBanner
            title={currentTask.title}
            description={bannerDescription}
            href={`/tasks/${currentTask.id}`}
            ctaLabel={bannerCta}
          />
        ) : null}

        <TaskProgress
          key={renderKey}
          completed={completedCount}
          total={TOTAL_TASKS}
          label="Task progress"
        />

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Summary
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Readiness</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{readiness}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasks complete</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {completedCount}
                <span className="text-lg font-normal text-gray-400">
                  {" "}
                  / {TOTAL_TASKS}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {remainingCount}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
              Tasks
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Open any task below. Tasks you have not reached yet stay locked until prior tasks are
              finished.
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
            {TASKS_ORDERED.map((t) => {
              const done = completedSet.has(t.id);
              const isCurrent = firstOpen === t.id;
              const workflowIndex = ALL_TASK_IDS.indexOf(t.id);
              const priorAllDone = ALL_TASK_IDS.slice(0, workflowIndex).every(
                (id) => completedSet.has(id),
              );
              const locked = !done && !priorAllDone && !isCurrent;

              type CardStatus = "completed" | "in-progress" | "not-started";
              const cardStatus: CardStatus = done
                ? "completed"
                : isCurrent
                  ? "in-progress"
                  : "not-started";

              const shellByStatus: Record<
                CardStatus,
                { border: string; bg: string; hover: string }
              > = {
                completed: {
                  border: "border-green-500",
                  bg: "bg-green-50",
                  hover: "hover:border-green-600 hover:shadow-sm",
                },
                "in-progress": {
                  border: "border-yellow-500",
                  bg: "bg-yellow-50",
                  hover: "hover:border-yellow-600 hover:shadow-sm",
                },
                "not-started": {
                  border: "border-gray-300",
                  bg: "bg-gray-50",
                  hover: "hover:border-gray-400 hover:shadow-sm",
                },
              };

              const shell = shellByStatus[cardStatus];
              const deemphasized = locked;
              const shellClass = `flex h-full min-h-[11rem] w-full min-w-0 flex-col cursor-pointer rounded-xl border-2 p-5 text-left shadow-sm transition duration-200 ease-out ${shell.border} ${shell.bg} ${shell.hover} ${deemphasized ? "opacity-60" : ""}`;

              const badgeByStatus: Record<CardStatus, string> = {
                completed:
                  "border border-green-600/40 bg-green-100/90 text-green-950",
                "in-progress":
                  "border border-yellow-600/40 bg-yellow-100/90 text-yellow-950",
                "not-started":
                  "border border-gray-400/50 bg-white/80 text-gray-800",
              };

              const badgeLabel: Record<CardStatus, string> = {
                completed: "Completed",
                "in-progress": "In Progress",
                "not-started": "Not Started",
              };

              return (
                <li key={t.id} className="flex h-full min-h-0">
                  <Link
                    href={`/tasks/${t.id}`}
                    className={`${shellClass} focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={
                      locked
                        ? `${t.title} — opens after prior tasks are complete`
                        : undefined
                    }
                  >
                    <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
                      <div className="shrink-0">
                        <p className="text-[11px] font-medium tracking-wide text-gray-600 uppercase">
                          {t.group}
                        </p>
                      </div>
                      <div className="min-h-0 flex-1">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900">
                          {t.title}
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-700">
                          {t.intro}
                        </p>
                      </div>
                      <div className="flex shrink-0 justify-end border-t border-black/5 pt-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${badgeByStatus[cardStatus]}`}
                        >
                          {badgeLabel[cardStatus]}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm ring-1 ring-gray-950/5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1 text-left">
              <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
                Onsite scheduling
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Final task — book your session after onboarding is finished.
              </p>
              {fullyReady ? (
                <p className="mt-4 text-sm font-medium leading-relaxed text-gray-900">
                  All tasks complete. You&apos;re ready to schedule your onsite session.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  Complete all tasks to unlock scheduling
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end sm:pl-4">
              {fullyReady ? (
                <Link
                  href="/schedule-onsite"
                  className="inline-flex h-11 min-w-[12rem] items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  Schedule Onsite
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 min-w-[12rem] cursor-not-allowed items-center justify-center rounded-xl border-2 border-gray-300 bg-gray-100 px-6 text-sm font-semibold text-gray-600 opacity-50"
                >
                  Schedule Onsite
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

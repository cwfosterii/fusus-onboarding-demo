"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AgencyPointsOfContactForm } from "@/components/tasks/AgencyPointsOfContactForm";
import { DataInputModeSelector } from "@/components/tasks/DataInputModeSelector";
import { ManualEntryForm } from "@/components/tasks/ManualEntryForm";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TemplateUploadPanel } from "@/components/tasks/TemplateUploadPanel";
import { TaskProgress } from "@/components/tasks/TaskProgress";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskVideo } from "@/components/tasks/TaskVideo";
import {
  ALL_TASK_IDS,
  TOTAL_TASKS,
  getGuidanceSteps,
  getPreviousTaskId,
  getTaskById,
  getTaskIndex,
  type TaskStatus,
  type WorkflowTask,
} from "@/lib/task-workflow-config";
import {
  AGENCY_POC_TASK_ID,
  defaultAgencyPocFormData,
  isAgencyPocFormValid,
  readAgencyPocFromStorage,
  toAgencyPocApiPayload,
  writeAgencyPocToStorage,
  type AgencyPocFormData,
} from "@/lib/agency-poc-form";
import {
  buildReadinessSubmitData,
  getReadinessIngestApiPath,
  isManualEntryValid,
  isTemplatePathSatisfied,
  metaFromFile,
  readInputModeFromStorage,
  readTemplateMetaFromStorage,
  taskUsesDualInputModes,
  writeInputModeToStorage,
  writeTemplateMetaToStorage,
  type DataInputMode,
  type SpreadsheetUploadMeta,
} from "@/lib/readiness-data-input";
import {
  advanceGuidanceVisibleIndex,
  ensureGuidanceStarted,
  getCompletedTaskIds,
  getFirstIncompleteTaskId,
  getGuidanceVisibleIndex,
  isTaskVideoCompleteInStorage,
  markTaskComplete,
  markTaskVideoComplete,
  markWelcomeVideoWatched,
  readTaskProgress,
  setTaskStatus,
} from "@/lib/task-progress-storage";

function formStorageKey(taskId: string) {
  return `fusus-task-form-${taskId}`;
}

function loadFormValues(taskId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(formStorageKey(taskId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveFormValues(taskId: string, values: Record<string, string>) {
  window.localStorage.setItem(formStorageKey(taskId), JSON.stringify(values));
}

function canAccessTask(taskId: string, completed: Set<string>): boolean {
  const idx = ALL_TASK_IDS.indexOf(taskId);
  if (idx < 0) return false;
  for (let i = 0; i < idx; i++) {
    if (!completed.has(ALL_TASK_IDS[i])) return false;
  }
  return true;
}

function genericFormIsValid(
  task: WorkflowTask,
  values: Record<string, string>,
): boolean {
  if (!task.form) return true;
  return task.form.fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.name]?.trim();
    return Boolean(v);
  });
}

function taskFormIsValid(
  task: WorkflowTask,
  values: Record<string, string>,
  agencyPoc: AgencyPocFormData,
  dual?: {
    enabled: boolean;
    mode: DataInputMode;
    templateMeta: SpreadsheetUploadMeta | null;
  },
): boolean {
  if (!task.form) return true;
  if (task.id === AGENCY_POC_TASK_ID) return isAgencyPocFormValid(agencyPoc);
  if (dual?.enabled) {
    if (dual.mode === "manual") {
      return isManualEntryValid(task.form.fields, values);
    }
    return isTemplatePathSatisfied(dual.templateMeta);
  }
  return genericFormIsValid(task, values);
}

export default function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const router = useRouter();
  const task = getTaskById(taskId);

  const [hydrated, setHydrated] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [agencyPocForm, setAgencyPocForm] = useState<AgencyPocFormData>(() =>
    defaultAgencyPocFormData(),
  );
  const [dataInputMode, setDataInputMode] = useState<DataInputMode>("manual");
  const [templateFileMeta, setTemplateFileMeta] =
    useState<SpreadsheetUploadMeta | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [showPsoNotes, setShowPsoNotes] = useState(false);

  const bumpProgress = useCallback(() => setProgressTick((t) => t + 1), []);

  useEffect(() => {
    setShowPsoNotes(
      typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("pso") === "1",
    );
  }, [taskId]);

  useEffect(() => {
    const onTask = () => bumpProgress();
    window.addEventListener("fusus-task-progress-updated", onTask);
    return () => window.removeEventListener("fusus-task-progress-updated", onTask);
  }, [bumpProgress]);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage */
  useEffect(() => {
    const progress = readTaskProgress();
    const completed = new Set(progress.completedTaskIds);
    if (!task) {
      setHydrated(true);
      return;
    }
    setTaskStatus(task.id, "in-progress");
    if (task.id === AGENCY_POC_TASK_ID) {
      setAgencyPocForm(readAgencyPocFromStorage());
    } else {
      setFormValues(loadFormValues(task.id));
    }
    if (taskUsesDualInputModes(task)) {
      setDataInputMode(readInputModeFromStorage(task.id));
      setTemplateFileMeta(readTemplateMetaFromStorage(task.id));
    } else {
      setDataInputMode("manual");
      setTemplateFileMeta(null);
    }
    const inStorage = isTaskVideoCompleteInStorage(task.id);
    const isDone = completed.has(task.id);
    if (task.videoEmbedUrl) {
      setVideoEnded(
        isDone || inStorage || task.videoUnlockAfterSeconds <= 0,
      );
    } else {
      setVideoEnded(true);
    }
    setHydrated(true);
  }, [task, taskId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const completedIds = getCompletedTaskIds();
  const completedSet = useMemo(() => new Set(completedIds), [completedIds, progressTick]);

  const steps = useMemo(
    () => (task ? getGuidanceSteps(task) : []),
    [task],
  );

  const videoSatisfied = useMemo(() => {
    if (!task) return false;
    if (!task.videoEmbedUrl) return true;
    return (
      videoEnded ||
      isTaskVideoCompleteInStorage(task.id) ||
      completedSet.has(task.id)
    );
  }, [task, videoEnded, completedSet, progressTick]);

  useEffect(() => {
    if (!hydrated || !task || steps.length === 0) return;
    if (videoSatisfied) {
      ensureGuidanceStarted(task.id, steps.length);
    }
  }, [hydrated, task, steps.length, videoSatisfied]);

  const handleVideoEnded = useCallback(() => {
    setVideoEnded(true);
    if (!task) return;
    markTaskVideoComplete(task.id);
    if (task.id === "welcome") {
      markWelcomeVideoWatched();
    }
    ensureGuidanceStarted(task.id, getGuidanceSteps(task).length);
    bumpProgress();
  }, [task, bumpProgress]);

  const handleFormChange = useCallback(
    (name: string, value: string) => {
      setFormValues((prev) => {
        const next = { ...prev, [name]: value };
        if (task) saveFormValues(task.id, next);
        return next;
      });
    },
    [task],
  );

  const handleAgencyPocChange = useCallback((next: AgencyPocFormData) => {
    setAgencyPocForm(next);
    writeAgencyPocToStorage(next);
  }, []);

  const status: TaskStatus = useMemo(() => {
    if (!task) return "not-started";
    if (completedSet.has(task.id)) return "complete";
    return "in-progress";
  }, [task, completedSet]);

  const accessBlocked = useMemo(() => {
    if (!task) return true;
    return !canAccessTask(task.id, completedSet) && !completedSet.has(task.id);
  }, [task, completedSet]);

  const isTaskComplete = task ? completedSet.has(task.id) : false;

  const canProceed = useMemo(() => {
    if (!task || accessBlocked) return false;
    const videoOk =
      !task.videoEmbedUrl ||
      videoEnded ||
      isTaskVideoCompleteInStorage(task.id) ||
      isTaskComplete;
    const dualEnabled = Boolean(task.form?.dualInputModes);
    const formOk =
      !task.form ||
      taskFormIsValid(task, formValues, agencyPocForm, {
        enabled: dualEnabled,
        mode: dataInputMode,
        templateMeta: templateFileMeta,
      }) ||
      isTaskComplete;
    return isTaskComplete || (videoOk && formOk);
  }, [
    task,
    accessBlocked,
    videoEnded,
    formValues,
    agencyPocForm,
    dataInputMode,
    templateFileMeta,
    isTaskComplete,
    progressTick,
  ]);

  const handleNext = useCallback(async () => {
    if (!task || !canProceed) return;

    if (!isTaskComplete) {
      if (task.form) {
        try {
          const data =
            task.id === AGENCY_POC_TASK_ID
              ? toAgencyPocApiPayload(agencyPocForm)
              : task.form?.dualInputModes
                ? buildReadinessSubmitData({
                    taskId: task.id,
                    mode: dataInputMode,
                    manualValues: formValues,
                    templateMeta: templateFileMeta,
                  })
                : formValues;
          await fetch(task.form.submitEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: task.id,
              submittedAt: new Date().toISOString(),
              data,
            }),
          });
        } catch {
          /* non-blocking for local demo */
        }
      }
      markTaskComplete(task.id);
    }

    const nextId = task.nextTaskId;
    if (nextId) {
      router.push(`/tasks/${nextId}`);
    } else {
      router.push("/");
    }
  }, [
    task,
    canProceed,
    isTaskComplete,
    formValues,
    agencyPocForm,
    dataInputMode,
    templateFileMeta,
    router,
  ]);

  const handleDataInputModeChange = useCallback(
    (mode: DataInputMode) => {
      setDataInputMode(mode);
      if (task?.id) writeInputModeToStorage(task.id, mode);
    },
    [task?.id],
  );

  const handleTemplateFileSelected = useCallback(
    (file: File | null) => {
      const meta = file ? metaFromFile(file) : null;
      setTemplateFileMeta(meta);
      if (task?.id && task.form?.dualInputModes) {
        writeTemplateMetaToStorage(task.id, meta);
      }
    },
    [task?.id, task?.form?.dualInputModes],
  );

  if (!hydrated || !task) {
    if (hydrated && !task) {
      return (
        <main className="min-h-screen bg-gray-50 p-6 sm:p-8">
          <p className="text-gray-700">Task not found.</p>
          <Link href="/" className="mt-4 text-blue-600 underline">
            Back to home
          </Link>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-gray-50 p-6 sm:p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  const index = getTaskIndex(task.id) + 1;
  const previousTaskId = getPreviousTaskId(task.id);
  const previousHref = previousTaskId ? `/tasks/${previousTaskId}` : "/";
  const previousLabel = previousTaskId ? "Previous task" : "Back";

  const firstOpen = getFirstIncompleteTaskId();
  const instruction = accessBlocked
    ? "Finish earlier tasks first — this one unlocks in order."
    : task.videoEmbedUrl
      ? "Watch the video, review the task tips below, then use Next task when it unlocks."
      : "Fill in the details below, review the task tips, then use Next task.";

  const guidanceIdx = getGuidanceVisibleIndex(task.id);

  const navBtnMin =
    "min-h-11 min-w-[11rem] shrink-0 whitespace-nowrap px-5 sm:min-w-[11.5rem]";
  const navSecondaryClass = `inline-flex ${navBtnMin} items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`;
  const navPrimaryClass = `inline-flex ${navBtnMin} items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40`;

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {accessBlocked ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <p className="font-medium">This task is not available yet.</p>
            <p className="mt-1 text-amber-900/90">
              Complete prior tasks in order, or return to the home page.
            </p>
            {firstOpen ? (
              <Link
                href={`/tasks/${firstOpen}`}
                className="mt-3 inline-block font-semibold text-amber-950 underline"
              >
                Go to current task
              </Link>
            ) : (
              <Link href="/" className="mt-3 inline-block font-semibold underline">
                Back to home
              </Link>
            )}
          </div>
        ) : null}

        <header>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {task.title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{task.intro}</p>
        </header>

        <div className="space-y-3">
          <TaskProgress
            completed={completedIds.length}
            total={TOTAL_TASKS}
            label="Task progress"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Task {index} of {TOTAL_TASKS}
            </span>
            <TaskStatusBadge status={status} />
          </div>
        </div>

        <p className="text-sm font-medium text-gray-800">{instruction}</p>

        {task.videoEmbedUrl ? (
          <TaskVideo
            embedUrl={task.videoEmbedUrl}
            title={task.videoTitle}
            unlockAfterSeconds={task.videoUnlockAfterSeconds}
            onEnded={handleVideoEnded}
          />
        ) : null}

        {task.form ? (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>
            <fieldset
              disabled={accessBlocked}
              className="m-0 min-w-0 border-0 p-0"
            >
              <p className="mt-1 text-xs text-gray-500">
                Mock submit endpoint:{" "}
                <code className="text-gray-600">{task.form.submitEndpoint}</code>
              </p>
              {task.form.dualInputModes ? (
                <p className="mt-1 text-xs text-gray-500">
                  Planned ingest API (Phase 2):{" "}
                  <code className="text-gray-600">
                    {getReadinessIngestApiPath(task.id)}
                  </code>
                </p>
              ) : null}
              <div className="mt-4 space-y-6">
                {taskUsesDualInputModes(task) ? (
                  <>
                    <DataInputModeSelector
                      value={dataInputMode}
                      onChange={handleDataInputModeChange}
                      disabled={accessBlocked}
                    />
                    <div className="border-t border-gray-100 pt-6">
                      {dataInputMode === "manual" ? (
                        <ManualEntryForm
                          fields={task.form.fields}
                          values={formValues}
                          onChange={handleFormChange}
                          disabled={accessBlocked}
                          showRequiredErrors={
                            !isManualEntryValid(task.form.fields, formValues)
                          }
                        />
                      ) : (
                        <TemplateUploadPanel
                          taskId={task.id}
                          fileMeta={templateFileMeta}
                          onFileSelected={handleTemplateFileSelected}
                          disabled={accessBlocked}
                        />
                      )}
                    </div>
                  </>
                ) : task.id === AGENCY_POC_TASK_ID ? (
                  <AgencyPointsOfContactForm
                    value={agencyPocForm}
                    onChange={handleAgencyPocChange}
                    disabled={accessBlocked}
                  />
                ) : (
                  <TaskForm
                    fields={task.form.fields}
                    values={formValues}
                    onChange={handleFormChange}
                  />
                )}
              </div>
            </fieldset>
          </section>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">
            What to do next
          </h2>
          {isTaskComplete ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {task.whatNext}
            </p>
          ) : steps.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">{task.whatNext}</p>
          ) : (
            <div className="mt-3">
              {guidanceIdx < 0 && task.videoEmbedUrl && !videoSatisfied ? (
                <p className="text-sm text-gray-600">
                  Finish the video to see guidance for this task.
                </p>
              ) : null}
              {guidanceIdx >= 0 ? (
                <div>
                  <p className="text-sm leading-relaxed text-gray-900">
                    {steps[guidanceIdx]}
                  </p>
                  {guidanceIdx < steps.length - 1 ? (
                    <button
                      type="button"
                      className="mt-3 text-sm font-semibold text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900"
                      onClick={() => {
                        advanceGuidanceVisibleIndex(task.id, steps.length);
                        bumpProgress();
                      }}
                    >
                      Show next task tip
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <div className="flex min-w-0 items-center justify-between gap-3 overflow-x-auto border-t border-gray-200 pt-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className={navSecondaryClass}>
              Home
            </Link>
            <Link href={previousHref} className={navSecondaryClass}>
              {previousLabel}
            </Link>
          </div>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className={navPrimaryClass}
          >
            Next Task
          </button>
        </div>

        {showPsoNotes ? (
          <section className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-5">
            <h2 className="text-xs font-bold tracking-wide text-amber-900 uppercase">
              PSO notes
            </h2>
            <p className="mt-2 text-sm text-amber-950/85">
              Internal notes for this task are not configured. Add content in
              admin tools when available.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

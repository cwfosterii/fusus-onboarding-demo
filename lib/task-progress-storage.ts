import { ALL_TASK_IDS, TOTAL_TASKS, type TaskStatus } from "@/lib/task-workflow-config";

export const TASK_PROGRESS_KEY = "fusus-task-progress-v1";

/** Set when the Welcome task video unlock timer completes (drives home CTA copy). */
export const WELCOME_VIDEO_WATCHED_KEY = "fusus-welcome-video-watched";

export function hasWelcomeVideoBeenWatched(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WELCOME_VIDEO_WATCHED_KEY) === "1";
}

export function markWelcomeVideoWatched(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WELCOME_VIDEO_WATCHED_KEY, "1");
  window.dispatchEvent(new Event("fusus-task-progress-updated"));
}

export type TaskProgressState = {
  completedTaskIds: string[];
  /** Optional per-task status — defaults derived from completed set */
  statusByTaskId?: Record<string, TaskStatus>;
  /** Per-task: HeyGen/timer gate satisfied (persisted for returning users). */
  videoCompletedByTaskId?: Record<string, boolean>;
  /** Per-task: visible index in guidance list (-1 = none yet). */
  guidanceVisibleIndexByTaskId?: Record<string, number>;
};

function defaultState(): TaskProgressState {
  return {
    completedTaskIds: [],
    statusByTaskId: {},
    videoCompletedByTaskId: {},
    guidanceVisibleIndexByTaskId: {},
  };
}

export function readTaskProgress(): TaskProgressState {
  if (typeof window === "undefined") return defaultState();
  const raw = window.localStorage.getItem(TASK_PROGRESS_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as TaskProgressState;
    return {
      completedTaskIds: Array.isArray(parsed.completedTaskIds)
        ? parsed.completedTaskIds
        : [],
      statusByTaskId:
        parsed.statusByTaskId && typeof parsed.statusByTaskId === "object"
          ? parsed.statusByTaskId
          : {},
      videoCompletedByTaskId:
        parsed.videoCompletedByTaskId &&
        typeof parsed.videoCompletedByTaskId === "object"
          ? parsed.videoCompletedByTaskId
          : {},
      guidanceVisibleIndexByTaskId:
        parsed.guidanceVisibleIndexByTaskId &&
        typeof parsed.guidanceVisibleIndexByTaskId === "object"
          ? parsed.guidanceVisibleIndexByTaskId
          : {},
    };
  } catch {
    return defaultState();
  }
}

export function writeTaskProgress(state: TaskProgressState) {
  window.localStorage.setItem(TASK_PROGRESS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("fusus-task-progress-updated"));
}

export function getCompletedTaskIds(): string[] {
  return readTaskProgress().completedTaskIds;
}

export function isTaskCompleted(taskId: string): boolean {
  return readTaskProgress().completedTaskIds.includes(taskId);
}

export function isTaskVideoCompleteInStorage(taskId: string): boolean {
  return Boolean(readTaskProgress().videoCompletedByTaskId?.[taskId]);
}

export function markTaskVideoComplete(taskId: string) {
  const prev = readTaskProgress();
  writeTaskProgress({
    ...prev,
    videoCompletedByTaskId: {
      ...prev.videoCompletedByTaskId,
      [taskId]: true,
    },
  });
}

export function getGuidanceVisibleIndex(taskId: string): number {
  const v = readTaskProgress().guidanceVisibleIndexByTaskId?.[taskId];
  return typeof v === "number" ? v : -1;
}

export function setGuidanceVisibleIndex(taskId: string, index: number) {
  const prev = readTaskProgress();
  writeTaskProgress({
    ...prev,
    guidanceVisibleIndexByTaskId: {
      ...prev.guidanceVisibleIndexByTaskId,
      [taskId]: index,
    },
  });
}

/** Reveal the next guidance line (clamped). Returns the new index. */
export function advanceGuidanceVisibleIndex(
  taskId: string,
  stepCount: number,
): number {
  if (stepCount <= 1) return getGuidanceVisibleIndex(taskId);
  const prevIdx = getGuidanceVisibleIndex(taskId);
  if (prevIdx < 0) return prevIdx;
  if (prevIdx >= stepCount - 1) return prevIdx;
  const next = prevIdx + 1;
  setGuidanceVisibleIndex(taskId, next);
  return next;
}

/** After video unlock (or no video), show the first guidance line if any. */
export function ensureGuidanceStarted(taskId: string, stepCount: number) {
  if (stepCount <= 0) return;
  if (getGuidanceVisibleIndex(taskId) < 0) {
    setGuidanceVisibleIndex(taskId, 0);
  }
}

export function markTaskComplete(taskId: string) {
  const prev = readTaskProgress();
  const next = new Set(prev.completedTaskIds);
  next.add(taskId);
  const statusByTaskId = { ...prev.statusByTaskId, [taskId]: "complete" as const };
  writeTaskProgress({
    completedTaskIds: [...next],
    statusByTaskId,
    videoCompletedByTaskId: {
      ...prev.videoCompletedByTaskId,
      [taskId]: true,
    },
  });
}

export function setTaskStatus(taskId: string, status: TaskStatus) {
  const prev = readTaskProgress();
  writeTaskProgress({
    ...prev,
    statusByTaskId: { ...prev.statusByTaskId, [taskId]: status },
  });
}

export function getDerivedStatus(taskId: string): TaskStatus {
  const { completedTaskIds, statusByTaskId } = readTaskProgress();
  if (completedTaskIds.includes(taskId)) return "complete";
  const idx = ALL_TASK_IDS.indexOf(taskId);
  if (idx <= 0) {
    return statusByTaskId?.[taskId] ?? "not-started";
  }
  const prevId = ALL_TASK_IDS[idx - 1];
  const priorDone = completedTaskIds.includes(prevId);
  if (!priorDone) return "not-started";
  return statusByTaskId?.[taskId] ?? "not-started";
}

export function taskReadinessPercent(): number {
  const done = getCompletedTaskIds().length;
  if (TOTAL_TASKS === 0) return 0;
  return Math.round((done / TOTAL_TASKS) * 100);
}

export function isAllTasksComplete(): boolean {
  return getCompletedTaskIds().length >= TOTAL_TASKS && TOTAL_TASKS > 0;
}

export function getFirstIncompleteTaskId(): string | null {
  const done = new Set(getCompletedTaskIds());
  for (const id of ALL_TASK_IDS) {
    if (!done.has(id)) return id;
  }
  return null;
}

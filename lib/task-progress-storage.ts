import {
  ALL_TASK_IDS,
  OPTIONAL_TASK_IDS,
  REQUIRED_TASK_IDS,
  TOTAL_TASKS,
} from "@/lib/task-workflow-config";
import {
  isEffectivelyComplete,
  isValidLifecycleState,
  migrateLegacyStatus,
  nextStateOnOpen,
  nextStateOnComplete,
  nextStateOnReject,
  nextStateOnSubmit,
  nextStateOnValidate,
  type TaskLifecycleState,
} from "@/lib/task-lifecycle";

// ─── Storage keys ─────────────────────────────────────────────────────────────

/** Scoped key — prefix can later include agency/deployment IDs. */
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

// ─── Storage shape ────────────────────────────────────────────────────────────

export type TaskProgressState = {
  /**
   * Canonical lifecycle state per task.
   * Source of truth — completedTaskIds is derived from this.
   */
  lifecycleByTaskId: Record<string, TaskLifecycleState>;
  /**
   * Derived list: tasks whose lifecycle is "validated" or "complete".
   * Written on every save for backward compat with code that reads completedTaskIds.
   */
  completedTaskIds: string[];
  /** Per-task: HeyGen/timer gate satisfied (persisted for returning users). */
  videoCompletedByTaskId: Record<string, boolean>;
  /** Per-task: visible index in guidance list (-1 = none yet). */
  guidanceVisibleIndexByTaskId: Record<string, number>;
};

function defaultState(): TaskProgressState {
  return {
    lifecycleByTaskId: {},
    completedTaskIds: [],
    videoCompletedByTaskId: {},
    guidanceVisibleIndexByTaskId: {},
  };
}

// ─── Read / write ─────────────────────────────────────────────────────────────

export function readTaskProgress(): TaskProgressState {
  if (typeof window === "undefined") return defaultState();
  const raw = window.localStorage.getItem(TASK_PROGRESS_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Migrate old lifecycleByTaskId / statusByTaskId into canonical form
    const legacyCompleted = Array.isArray(parsed.completedTaskIds)
      ? (parsed.completedTaskIds as string[])
      : [];

    const rawLifecycle =
      parsed.lifecycleByTaskId &&
      typeof parsed.lifecycleByTaskId === "object" &&
      !Array.isArray(parsed.lifecycleByTaskId)
        ? (parsed.lifecycleByTaskId as Record<string, unknown>)
        : {};

    // Seed from old statusByTaskId (in-progress etc.) if present
    const legacyStatus =
      parsed.statusByTaskId &&
      typeof parsed.statusByTaskId === "object" &&
      !Array.isArray(parsed.statusByTaskId)
        ? (parsed.statusByTaskId as Record<string, unknown>)
        : {};

    const lifecycleByTaskId: Record<string, TaskLifecycleState> = {};

    // Start with old statusByTaskId values
    for (const [id, v] of Object.entries(legacyStatus)) {
      lifecycleByTaskId[id] = migrateLegacyStatus(v);
    }

    // Override with rawLifecycle (newer values)
    for (const [id, v] of Object.entries(rawLifecycle)) {
      if (isValidLifecycleState(v)) {
        lifecycleByTaskId[id] = v;
      } else {
        lifecycleByTaskId[id] = migrateLegacyStatus(v);
      }
    }

    // Ensure completed tasks are marked complete (backward compat migration)
    for (const id of legacyCompleted) {
      if (!lifecycleByTaskId[id] || lifecycleByTaskId[id] === "not_started") {
        lifecycleByTaskId[id] = "complete";
      }
    }

    const completedTaskIds = ALL_TASK_IDS.filter(
      (id) =>
        lifecycleByTaskId[id] !== undefined &&
        isEffectivelyComplete(lifecycleByTaskId[id]),
    );

    return {
      lifecycleByTaskId,
      completedTaskIds,
      videoCompletedByTaskId:
        parsed.videoCompletedByTaskId &&
        typeof parsed.videoCompletedByTaskId === "object" &&
        !Array.isArray(parsed.videoCompletedByTaskId)
          ? (parsed.videoCompletedByTaskId as Record<string, boolean>)
          : {},
      guidanceVisibleIndexByTaskId:
        parsed.guidanceVisibleIndexByTaskId &&
        typeof parsed.guidanceVisibleIndexByTaskId === "object" &&
        !Array.isArray(parsed.guidanceVisibleIndexByTaskId)
          ? (parsed.guidanceVisibleIndexByTaskId as Record<string, number>)
          : {},
    };
  } catch {
    return defaultState();
  }
}

export function writeTaskProgress(state: TaskProgressState) {
  // Always recompute completedTaskIds from lifecycle before persisting
  const completedTaskIds = ALL_TASK_IDS.filter(
    (id) =>
      state.lifecycleByTaskId[id] !== undefined &&
      isEffectivelyComplete(state.lifecycleByTaskId[id]),
  );
  window.localStorage.setItem(
    TASK_PROGRESS_KEY,
    JSON.stringify({ ...state, completedTaskIds }),
  );
  window.dispatchEvent(new Event("fusus-task-progress-updated"));
}

// ─── Lifecycle helpers ────────────────────────────────────────────────────────

export function getTaskLifecycleState(taskId: string): TaskLifecycleState {
  const { lifecycleByTaskId } = readTaskProgress();
  return lifecycleByTaskId[taskId] ?? "not_started";
}

export function setTaskLifecycleState(
  taskId: string,
  state: TaskLifecycleState,
) {
  const prev = readTaskProgress();
  writeTaskProgress({
    ...prev,
    lifecycleByTaskId: { ...prev.lifecycleByTaskId, [taskId]: state },
  });
}

/** Transition: not_started → in_progress (never regresses). */
export function startTask(taskId: string) {
  const current = getTaskLifecycleState(taskId);
  const next = nextStateOnOpen(current);
  if (next !== current) setTaskLifecycleState(taskId, next);
}

/** Transition: → submitted. */
export function submitTask(taskId: string) {
  const current = getTaskLifecycleState(taskId);
  setTaskLifecycleState(taskId, nextStateOnSubmit(current));
}

/** Transition: → validated. */
export function validateTask(taskId: string) {
  setTaskLifecycleState(taskId, nextStateOnValidate());
}

/** Transition: → rejected. */
export function rejectTask(taskId: string) {
  setTaskLifecycleState(taskId, nextStateOnReject());
}

/** Transition: → complete (used for video-only tasks). */
export function completeTask(taskId: string) {
  setTaskLifecycleState(taskId, nextStateOnComplete());
}

// ─── Derived helpers (backward compat surface) ────────────────────────────────

export function getCompletedTaskIds(): string[] {
  return readTaskProgress().completedTaskIds;
}

export function isTaskCompleted(taskId: string): boolean {
  return isEffectivelyComplete(getTaskLifecycleState(taskId));
}

/**
 * @deprecated Use startTask / setTaskLifecycleState instead.
 */
export function setTaskStatus(
  taskId: string,
  status: "not-started" | "in-progress" | "complete",
) {
  const mapped = migrateLegacyStatus(status);
  setTaskLifecycleState(taskId, mapped);
}

/**
 * @deprecated Use completeTask / validateTask instead.
 * Kept for callers that mark task complete directly (e.g. legacy markTaskComplete).
 */
export function markTaskComplete(taskId: string) {
  const prev = readTaskProgress();
  writeTaskProgress({
    ...prev,
    lifecycleByTaskId: { ...prev.lifecycleByTaskId, [taskId]: "complete" },
    videoCompletedByTaskId: {
      ...prev.videoCompletedByTaskId,
      [taskId]: true,
    },
  });
}

// ─── Video helpers ────────────────────────────────────────────────────────────

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

// ─── Guidance helpers ─────────────────────────────────────────────────────────

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

// ─── Readiness / progress ─────────────────────────────────────────────────────

export type ReadinessBreakdown = {
  /** Required tasks completed (hard gate for scheduling). */
  requiredDone: number;
  requiredTotal: number;
  /** Optional tasks completed (improve score, never block scheduling). */
  optionalDone: number;
  optionalTotal: number;
  /**
   * Weighted readiness score 0–100.
   * Required tasks contribute 70%, optional tasks contribute 30%.
   * All required done = minimum 70. All tasks done = 100.
   */
  score: number;
  /** True when every required task is validated or complete — the scheduling gate. */
  allRequiredComplete: boolean;
};

export function getReadinessBreakdown(): ReadinessBreakdown {
  const requiredDone = REQUIRED_TASK_IDS.filter((id) =>
    isEffectivelyComplete(getTaskLifecycleState(id)),
  ).length;
  const requiredTotal = REQUIRED_TASK_IDS.length;

  const optionalDone = OPTIONAL_TASK_IDS.filter((id) =>
    isEffectivelyComplete(getTaskLifecycleState(id)),
  ).length;
  const optionalTotal = OPTIONAL_TASK_IDS.length;

  // Required contributes 70%, optional contributes 30%
  const reqContrib = requiredTotal > 0 ? (requiredDone / requiredTotal) * 0.7 : 0;
  const optContrib = optionalTotal > 0 ? (optionalDone / optionalTotal) * 0.3 : 0;
  const score = Math.round((reqContrib + optContrib) * 100);

  return {
    requiredDone,
    requiredTotal,
    optionalDone,
    optionalTotal,
    score,
    allRequiredComplete: requiredDone === requiredTotal && requiredTotal > 0,
  };
}

/**
 * Weighted readiness percent.
 * Required tasks contribute 70%, optional 30%, so all-required-done = 70%.
 */
export function taskReadinessPercent(): number {
  return getReadinessBreakdown().score;
}

/** True when all required tasks are validated or complete. */
export function isAllTasksComplete(): boolean {
  return getReadinessBreakdown().allRequiredComplete;
}

/** First task ID that is not yet validated or complete. */
export function getFirstIncompleteTaskId(): string | null {
  for (const id of ALL_TASK_IDS) {
    if (!isEffectivelyComplete(getTaskLifecycleState(id))) return id;
  }
  return null;
}

/**
 * @deprecated Use taskReadinessPercent which is based on required tasks.
 */
export function getDerivedStatus(taskId: string): TaskLifecycleState {
  return getTaskLifecycleState(taskId);
}

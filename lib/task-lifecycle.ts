/**
 * Canonical task lifecycle model.
 *
 * State machine:
 *
 *   not_started
 *       │  (open task)
 *       ▼
 *   in_progress
 *       │  (submit with valid data)
 *       ▼
 *   submitted ────── (validation fails) ──► rejected
 *       │                                       │
 *       │  (validation passes)                  │ (re-submit)
 *       ▼                                       │
 *   validated ◄─────────────────────────────────┘
 *       │  (video-only or explicit completion)
 *       ▼
 *   complete
 *
 * For Phase 1, validation is mocked locally.
 * In Phase 2, replace mockValidate() with real API response handling.
 */

// ─── State type ──────────────────────────────────────────────────────────────

export type TaskLifecycleState =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "validated"
  | "rejected"
  | "complete";

export function isValidLifecycleState(v: unknown): v is TaskLifecycleState {
  return (
    v === "not_started" ||
    v === "in_progress" ||
    v === "submitted" ||
    v === "validated" ||
    v === "rejected" ||
    v === "complete"
  );
}

// ─── Customer-facing labels ───────────────────────────────────────────────────

export const TASK_LIFECYCLE_LABEL: Record<TaskLifecycleState, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  validated: "Ready",
  rejected: "Needs Attention",
  complete: "Complete",
};

// ─── Completion semantics ─────────────────────────────────────────────────────

/**
 * Whether a state satisfies "done" for unlocking the next task
 * and counting toward scheduling readiness.
 */
export function isEffectivelyComplete(state: TaskLifecycleState): boolean {
  return state === "validated" || state === "complete";
}

// ─── Pure state transitions ───────────────────────────────────────────────────

/** Call when a task page is opened. Never regresses state. */
export function nextStateOnOpen(
  current: TaskLifecycleState,
): TaskLifecycleState {
  if (current === "not_started") return "in_progress";
  return current;
}

/** Call when the user submits/saves a form. */
export function nextStateOnSubmit(
  current: TaskLifecycleState,
): TaskLifecycleState {
  if (
    current === "not_started" ||
    current === "in_progress" ||
    current === "rejected"
  ) {
    return "submitted";
  }
  return current;
}

/** Call when validation passes (API or local mock). */
export function nextStateOnValidate(): TaskLifecycleState {
  return "validated";
}

/** Call when validation fails (API or local mock). */
export function nextStateOnReject(): TaskLifecycleState {
  return "rejected";
}

/** Call for video-only tasks (no form submission). */
export function nextStateOnComplete(): TaskLifecycleState {
  return "complete";
}

/**
 * Phase 1 — local mock validation.
 * Returns "validated" when the form passes local rules, "rejected" otherwise.
 * Replace this with real API response handling in Phase 2.
 */
export function mockValidate(isValid: boolean): TaskLifecycleState {
  return isValid ? "validated" : "rejected";
}

// ─── UI styling helpers ───────────────────────────────────────────────────────

/** Ring/pill classes for TaskStatusBadge. */
export function taskLifecycleBadgeClass(state: TaskLifecycleState): string {
  switch (state) {
    case "not_started":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "in_progress":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "submitted":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "validated":
    case "complete":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-800 ring-red-200";
  }
}

/** Card shell (border, bg, hover) for the home page task grid. */
export function taskCardShell(state: TaskLifecycleState): {
  border: string;
  bg: string;
  hover: string;
} {
  switch (state) {
    case "not_started":
      return {
        border: "border-gray-300",
        bg: "bg-gray-50",
        hover: "hover:border-gray-400 hover:shadow-sm",
      };
    case "in_progress":
    case "submitted":
      return {
        border: "border-yellow-500",
        bg: "bg-yellow-50",
        hover: "hover:border-yellow-600 hover:shadow-sm",
      };
    case "validated":
    case "complete":
      return {
        border: "border-green-500",
        bg: "bg-green-50",
        hover: "hover:border-green-600 hover:shadow-sm",
      };
    case "rejected":
      return {
        border: "border-red-400",
        bg: "bg-red-50",
        hover: "hover:border-red-500 hover:shadow-sm",
      };
  }
}

// ─── Legacy migration ─────────────────────────────────────────────────────────

/**
 * Migrate old hyphenated `TaskStatus` values (stored before v2)
 * to the canonical underscore lifecycle state.
 */
export function migrateLegacyStatus(raw: unknown): TaskLifecycleState {
  switch (raw) {
    case "not-started":
    case "not_started":
      return "not_started";
    case "in-progress":
    case "in_progress":
      return "in_progress";
    case "complete":
      return "complete";
    case "submitted":
      return "submitted";
    case "validated":
      return "validated";
    case "rejected":
      return "rejected";
    default:
      return "not_started";
  }
}

// ─── API payload shape (Phase 2 readiness) ────────────────────────────────────

export type TaskApiPayload = {
  taskId: string;
  state: TaskLifecycleState;
  submittedAt: string;
  data: unknown;
  /** Planned endpoint — not called until Phase 2. */
  plannedEndpoint: string;
};

export function buildTaskApiPayload(args: {
  taskId: string;
  state: TaskLifecycleState;
  data: unknown;
  plannedEndpoint: string;
}): TaskApiPayload {
  return {
    taskId: args.taskId,
    state: args.state,
    submittedAt: new Date().toISOString(),
    data: args.data,
    plannedEndpoint: args.plannedEndpoint,
  };
}

/**
 * Persisted deployment row — shape designed to map 1:1 to a future API resource.
 */
export type DeploymentRecord = {
  id: string;
  agencyName: string;
  /** Completed task ids (same ids as `lib/task-workflow-config.ts`). */
  completedStepIds: string[];
  scheduleStatus: "none" | "submitted" | "confirmed";
  /** Preferred or confirmed onsite date (ISO yyyy-mm-dd) when known. */
  onsiteDate: string | null;
  /** Preferred onsite time (HH:mm) when known. */
  onsiteTime?: string | null;
  /** PSO-only flag (stored locally until API exists). */
  psoMarkedReadyToSchedule?: boolean;
};

/** Enriched view for UI — can be produced client- or server-side later. */
export type DeploymentViewModel = DeploymentRecord & {
  currentStepId: string | null;
  currentStepTitle: string;
  readinessPercent: number;
  /** Count of workflow tasks not yet complete. */
  remainingStepCount: number;
  /** Incomplete tasks (same order as the workflow config). */
  remainingSteps: { id: string; title: string }[];
  onsiteTime: string | null;
  psoMarkedReadyToSchedule: boolean;
  /** Filter chips — OR semantics when multiple filters active. */
  flags: {
    readyToSchedule: boolean;
    hasOpenSteps: boolean;
    inProgress: boolean;
    complete: boolean;
  };
};

export type DeploymentFilterId =
  | "readyToSchedule"
  | "openSteps"
  | "inProgress"
  | "complete";

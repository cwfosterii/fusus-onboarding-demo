import type {
  DeploymentFilterId,
  DeploymentRecord,
  DeploymentViewModel,
} from "@/lib/deployment-types";
import {
  ALL_TASK_IDS,
  TOTAL_TASKS,
  TASKS_ORDERED,
  getTaskById,
} from "@/lib/task-workflow-config";
import { readTaskProgress } from "@/lib/task-progress-storage";

const DEPLOYMENTS_STORE_KEY = "fusus-pso-deployments-v1";
const SCHEDULE_REQUEST_KEY = "fusus-onsite-request";

/** Customer row synced with the guided task flow. */
export const SYNCED_DEMO_CUSTOMER_ID = "cust-demo";

/** Admin/workflow UI: same order as customer tasks. */
export const WORKFLOW_STEPS = TASKS_ORDERED.map((t) => ({
  id: t.id,
  title: t.title,
  description: t.intro,
}));

export type WorkflowChecklistItem = { id: string; label: string };

function readStoredDeployments(): Record<string, DeploymentRecord> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DEPLOYMENTS_STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, DeploymentRecord>;
  } catch {
    return null;
  }
}

function writeStoredDeployments(map: Record<string, DeploymentRecord>) {
  window.localStorage.setItem(DEPLOYMENTS_STORE_KEY, JSON.stringify(map));
}

/** Default seed — overlaid by localStorage; API can mirror this shape later. */
export const DEPLOYMENT_SEED: DeploymentRecord[] = [
  {
    id: SYNCED_DEMO_CUSTOMER_ID,
    agencyName: "Riverside Metro PD",
    completedStepIds: [],
    scheduleStatus: "none",
    onsiteDate: null,
    onsiteTime: null,
  },
  {
    id: "cust-lakeside",
    agencyName: "Lakeside County SO",
    completedStepIds: ["welcome"],
    scheduleStatus: "none",
    onsiteDate: null,
    onsiteTime: null,
  },
  {
    id: "cust-summit",
    agencyName: "Summit City PD",
    completedStepIds: [...ALL_TASK_IDS],
    scheduleStatus: "submitted",
    onsiteDate: "2026-05-14",
    onsiteTime: "09:30",
  },
  {
    id: "cust-harbor",
    agencyName: "Harbor Point PD",
    completedStepIds: ["welcome", "agency-setup-roles", "agency-setup-users"],
    scheduleStatus: "none",
    onsiteDate: null,
    onsiteTime: null,
  },
  {
    id: "cust-valley",
    agencyName: "Valley Transit PD",
    completedStepIds: [],
    scheduleStatus: "none",
    onsiteDate: null,
    onsiteTime: null,
  },
];

function mergeRecord(
  seed: DeploymentRecord,
  stored: DeploymentRecord | undefined,
): DeploymentRecord {
  if (!stored) return { ...seed };
  return {
    ...seed,
    ...stored,
    completedStepIds: stored.completedStepIds?.length
      ? [...stored.completedStepIds]
      : [...seed.completedStepIds],
  };
}

export type ScheduleRequestPayload = {
  preferredDate?: string;
  preferredTime?: string;
  agencyName?: string;
};

function readScheduleRequestPayload(): ScheduleRequestPayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SCHEDULE_REQUEST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScheduleRequestPayload;
  } catch {
    return null;
  }
}

function toViewModel(record: DeploymentRecord): DeploymentViewModel {
  const completed = new Set(record.completedStepIds);
  const total = TOTAL_TASKS;
  const doneCount = ALL_TASK_IDS.filter((id) => completed.has(id)).length;
  const readinessPercent =
    total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const incomplete = ALL_TASK_IDS.filter((id) => !completed.has(id));
  const firstIncomplete = incomplete[0];
  const currentStepId = firstIncomplete ?? null;
  const currentStepTitle = firstIncomplete
    ? (getTaskById(firstIncomplete)?.title ?? "—")
    : readinessPercent === 100
      ? "All tasks complete"
      : "—";

  const remainingSteps = incomplete.map((id) => ({
    id,
    title: getTaskById(id)?.title ?? id,
  }));

  const readyToSchedule =
    readinessPercent === 100 && record.scheduleStatus === "none";
  const hasOpenSteps = readinessPercent < 100 && remainingSteps.length > 0;
  const inProgress = readinessPercent > 0 && readinessPercent < 100;
  const complete =
    readinessPercent === 100 && record.scheduleStatus !== "none";

  return {
    ...record,
    onsiteTime: record.onsiteTime ?? null,
    psoMarkedReadyToSchedule: Boolean(record.psoMarkedReadyToSchedule),
    currentStepId,
    currentStepTitle,
    readinessPercent,
    remainingStepCount: remainingSteps.length,
    remainingSteps,
    flags: {
      readyToSchedule,
      hasOpenSteps,
      inProgress,
      complete,
    },
  };
}

/** Hydrate merged records (seed + persisted + live task progress for demo). */
export function getDeployments(): DeploymentViewModel[] {
  const storedMap = readStoredDeployments() ?? {};
  const schedule = readScheduleRequestPayload();
  const taskProgress = readTaskProgress().completedTaskIds;

  const merged: DeploymentRecord[] = DEPLOYMENT_SEED.map((seed) => {
    let rec = mergeRecord(seed, storedMap[seed.id]);

    if (seed.id === SYNCED_DEMO_CUSTOMER_ID) {
      rec = {
        ...rec,
        completedStepIds:
          taskProgress.length > 0 ? [...taskProgress] : [...rec.completedStepIds],
      };
      if (schedule?.agencyName) {
        rec = { ...rec, agencyName: schedule.agencyName };
      }
      if (schedule?.preferredDate) {
        rec = {
          ...rec,
          scheduleStatus: "submitted",
          onsiteDate: schedule.preferredDate,
          onsiteTime: schedule.preferredTime ?? rec.onsiteTime ?? null,
        };
      }
    }

    return rec;
  });

  return merged.map(toViewModel);
}

export function getDeployment(agencyId: string): DeploymentViewModel | undefined {
  return getDeployments().find((d) => d.id === agencyId);
}

export function psoNotesStorageKey(agencyId: string) {
  return `fusus-pso-notes-${agencyId}`;
}

export function readPsoNotes(agencyId: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(psoNotesStorageKey(agencyId)) ?? "";
}

export function writePsoNotes(agencyId: string, body: string) {
  window.localStorage.setItem(psoNotesStorageKey(agencyId), body);
}

export function patchDeploymentRecord(
  agencyId: string,
  patch: Partial<DeploymentRecord>,
): void {
  if (typeof window === "undefined") return;
  const seed = DEPLOYMENT_SEED.find((s) => s.id === agencyId);
  if (!seed) return;
  const map = readStoredDeployments() ?? {};
  const prev = map[agencyId] ?? {};
  map[agencyId] = { ...seed, ...prev, ...patch };
  writeStoredDeployments(map);
}

export function setPsoMarkedReadyToSchedule(agencyId: string, value: boolean) {
  patchDeploymentRecord(agencyId, { psoMarkedReadyToSchedule: value });
}

export function attachLatestScheduleRequestToDemoCustomer(): void {
  const schedule = readScheduleRequestPayload();
  if (!schedule?.preferredDate || typeof window === "undefined") return;

  const map = readStoredDeployments() ?? {};
  const existing = mergeRecord(
    DEPLOYMENT_SEED.find((s) => s.id === SYNCED_DEMO_CUSTOMER_ID)!,
    map[SYNCED_DEMO_CUSTOMER_ID],
  );

  map[SYNCED_DEMO_CUSTOMER_ID] = {
    ...existing,
    scheduleStatus: "submitted",
    onsiteDate: schedule.preferredDate,
    onsiteTime: schedule.preferredTime ?? existing.onsiteTime ?? null,
    ...(schedule.agencyName ? { agencyName: schedule.agencyName } : {}),
  };
  writeStoredDeployments(map);
}

export function deploymentMatchesFilters(
  d: DeploymentViewModel,
  search: string,
  activeFilters: Set<DeploymentFilterId>,
): boolean {
  const q = search.trim().toLowerCase();
  if (q && !d.agencyName.toLowerCase().includes(q)) return false;

  if (activeFilters.size === 0) return true;

  for (const f of activeFilters) {
    if (f === "readyToSchedule" && d.flags.readyToSchedule) return true;
    if (f === "openSteps" && d.flags.hasOpenSteps) return true;
    if (f === "inProgress" && d.flags.inProgress) return true;
    if (f === "complete" && d.flags.complete) return true;
  }
  return false;
}

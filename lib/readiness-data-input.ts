/**
 * Phase 1: dual input (manual vs spreadsheet) for readiness-style tasks.
 * UI + localStorage only — no ingest API yet. Shapes are forward-compatible.
 */

import type { TaskFormField, WorkflowTask } from "@/lib/task-workflow-config";

export type DataInputMode = "manual" | "template";

/** Stored client-side when user picks a file (no parsing in Phase 1). */
export type SpreadsheetUploadMeta = {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  lastModified: number;
};

export const TECHNICAL_READINESS_TASK_ID = "technical-readiness-network";
export const CAMERA_READINESS_TASK_ID = "camera-readiness-assets";

/** Static bulk camera CSV served from `public/templates/`. */
export const CAMERA_BULK_TEMPLATE_PUBLIC_PATH = "/templates/camera_template.csv";
export const CAMERA_BULK_TEMPLATE_DOWNLOAD_FILENAME = "camera_template.csv";

export function taskUsesDualInputModes(task: WorkflowTask): boolean {
  return Boolean(task.form?.dualInputModes);
}

/** Planned REST paths (not wired in Phase 1). */
export function getReadinessIngestApiPath(taskId: string): string {
  if (taskId === TECHNICAL_READINESS_TASK_ID) {
    return "/api/v1/tasks/technical-readiness";
  }
  if (taskId === CAMERA_READINESS_TASK_ID) {
    return "/api/v1/tasks/camera-readiness";
  }
  return "";
}

export function inputModeStorageKey(taskId: string): string {
  return `fusus-task-input-mode-${taskId}`;
}

export function templateMetaStorageKey(taskId: string): string {
  return `fusus-task-template-meta-${taskId}`;
}

export function readInputModeFromStorage(taskId: string): DataInputMode {
  if (typeof window === "undefined") return defaultDataInputMode();
  return parseDataInputMode(
    window.localStorage.getItem(inputModeStorageKey(taskId)),
  );
}

export function writeInputModeToStorage(
  taskId: string,
  mode: DataInputMode,
): void {
  window.localStorage.setItem(inputModeStorageKey(taskId), mode);
}

export function readTemplateMetaFromStorage(
  taskId: string,
): SpreadsheetUploadMeta | null {
  if (typeof window === "undefined") return null;
  return parseSpreadsheetUploadMeta(
    window.localStorage.getItem(templateMetaStorageKey(taskId)),
  );
}

export function writeTemplateMetaToStorage(
  taskId: string,
  meta: SpreadsheetUploadMeta | null,
): void {
  const key = templateMetaStorageKey(taskId);
  if (meta === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(meta));
}

export function defaultDataInputMode(): DataInputMode {
  return "manual";
}

export function parseDataInputMode(raw: string | null): DataInputMode {
  if (raw === "template" || raw === "manual") return raw;
  return "manual";
}

export function parseSpreadsheetUploadMeta(
  raw: string | null,
): SpreadsheetUploadMeta | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.fileName !== "string" || !o.fileName.trim()) return null;
    if (typeof o.fileSizeBytes !== "number") return null;
    if (typeof o.mimeType !== "string") return null;
    if (typeof o.lastModified !== "number") return null;
    return {
      fileName: o.fileName.trim(),
      fileSizeBytes: o.fileSizeBytes,
      mimeType: o.mimeType,
      lastModified: o.lastModified,
    };
  } catch {
    return null;
  }
}

export function metaFromFile(file: File): SpreadsheetUploadMeta {
  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    lastModified: file.lastModified,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** CSV template for technical readiness (headers only; Phase 1). */
export function getTechnicalReadinessTemplateCsv(): string {
  const headers = [
    "trustedDomains",
    "publicIpRange",
    "firewallNotes",
    "networkDiagramNote",
  ];
  return `${headers.join(",")}\n`;
}

export function getTechnicalReadinessTemplateFilename(): string {
  return "network-readiness-template.csv";
}

export function getTemplateDownloadForTask(taskId: string): {
  filename: string;
  content: string;
  mimeType: string;
} {
  if (taskId === TECHNICAL_READINESS_TASK_ID) {
    return {
      filename: getTechnicalReadinessTemplateFilename(),
      content: getTechnicalReadinessTemplateCsv(),
      mimeType: "text/csv;charset=utf-8",
    };
  }
  return {
    filename: "readiness-template.csv",
    content: "",
    mimeType: "text/csv;charset=utf-8",
  };
}

export function isManualEntryValid(
  fields: TaskFormField[],
  values: Record<string, string>,
): boolean {
  return fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.name]?.trim();
    return Boolean(v);
  });
}

export function isTemplatePathSatisfied(
  meta: SpreadsheetUploadMeta | null,
): boolean {
  return meta !== null;
}

export type ReadinessSubmitData = {
  inputMode: DataInputMode;
  manual: Record<string, string>;
  templateUpload: SpreadsheetUploadMeta | null;
  /** Document intended ingest route for Phase 2. */
  plannedIngestPath: string;
};

export function buildReadinessSubmitData(args: {
  taskId: string;
  mode: DataInputMode;
  manualValues: Record<string, string>;
  templateMeta: SpreadsheetUploadMeta | null;
}): ReadinessSubmitData {
  return {
    inputMode: args.mode,
    manual: args.mode === "manual" ? { ...args.manualValues } : {},
    templateUpload: args.mode === "template" ? args.templateMeta : null,
    plannedIngestPath: getReadinessIngestApiPath(args.taskId),
  };
}

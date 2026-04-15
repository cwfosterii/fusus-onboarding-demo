"use client";

import { useCallback } from "react";
import {
  CAMERA_BULK_TEMPLATE_DOWNLOAD_FILENAME,
  CAMERA_BULK_TEMPLATE_PUBLIC_PATH,
  CAMERA_READINESS_TASK_ID,
  formatFileSize,
  getReadinessIngestApiPath,
  getTemplateDownloadForTask,
  type SpreadsheetUploadMeta,
} from "@/lib/readiness-data-input";

const ACCEPT = ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

type Props = {
  taskId: string;
  fileMeta: SpreadsheetUploadMeta | null;
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
};

const btnClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function TemplateUploadPanel({
  taskId,
  fileMeta,
  onFileSelected,
  disabled,
}: Props) {
  const handleDownload = useCallback(async () => {
    if (taskId === CAMERA_READINESS_TASK_ID) {
      try {
        const res = await fetch(CAMERA_BULK_TEMPLATE_PUBLIC_PATH);
        if (!res.ok) throw new Error("Template fetch failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = CAMERA_BULK_TEMPLATE_DOWNLOAD_FILENAME;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        window.open(CAMERA_BULK_TEMPLATE_PUBLIC_PATH, "_blank", "noopener,noreferrer");
      }
      return;
    }

    const { filename, content, mimeType } = getTemplateDownloadForTask(taskId);
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [taskId]);

  const planned = getReadinessIngestApiPath(taskId);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Spreadsheet workflow
        </h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
          <li>Download the template below.</li>
          <li>Fill it out offline with your deployment details.</li>
          <li>Upload the completed file here (CSV or Excel).</li>
          <li>
            In a later phase you&apos;ll review parsed results here before
            final submit.
          </li>
        </ol>
      </div>

      {taskId === CAMERA_READINESS_TASK_ID ? (
        <p className="text-sm leading-relaxed text-gray-600">
          Use this template to provide camera data for bulk upload. Required fields
          must be completed.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          className={btnClass}
          onClick={() => void handleDownload()}
          disabled={disabled}
        >
          Download Template
        </button>
        <div className="min-w-0">
          <label
            htmlFor={`template-upload-${taskId}`}
            className="text-sm font-medium text-gray-800"
          >
            Upload spreadsheet
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              id={`template-upload-${taskId}`}
              type="file"
              accept={ACCEPT}
              disabled={disabled}
              className="block w-full min-w-0 max-w-md cursor-pointer text-sm text-gray-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onFileSelected(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Accepted: CSV, XLSX, XLS. Files are not parsed in this phase — only
            the filename and basic metadata are kept for now.
          </p>
        </div>
      </div>

      {fileMeta ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800"
          role="status"
        >
          <p className="font-medium text-gray-900">Selected file</p>
          <p className="mt-1 font-mono text-xs text-gray-700">{fileMeta.fileName}</p>
          <p className="mt-1 text-xs text-gray-600">
            {formatFileSize(fileMeta.fileSizeBytes)}
            {fileMeta.mimeType ? ` · ${fileMeta.mimeType}` : null}
          </p>
          <button
            type="button"
            disabled={disabled}
            className="mt-3 text-xs font-semibold text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900 disabled:opacity-50"
            onClick={() => onFileSelected(null)}
          >
            Clear selection
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600">No file selected yet.</p>
      )}

      <div
        className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-950"
        role="note"
      >
        <span className="font-semibold">Phase 1:</span> row-level validation and
        preview will run after upload in a future release. For now, pick a file to
        mark this path ready to continue.
      </div>

      {planned ? (
        <p className="text-xs text-gray-500">
          Planned ingest API (not called yet):{" "}
          <code className="text-gray-600">{planned}</code>
        </p>
      ) : null}
    </div>
  );
}

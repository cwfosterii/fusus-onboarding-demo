"use client";

import type {
  CameraValidationResult,
  ValidationIssue,
} from "@/lib/camera-validation";
import { VALIDATION_STATE_LABEL } from "@/lib/camera-validation";

type Props = {
  result: CameraValidationResult;
  /** Called when the user clicks "Fix and re-upload" — clears the result */
  onReupload: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function partition<T>(arr: T[], pred: (v: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  arr.forEach((v) => (pred(v) ? yes : no).push(v));
  return [yes, no];
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const isError = issue.severity === "error";
  return (
    <li className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm leading-snug">
        {issue.rowNumber > 0 ? (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
            Row {issue.rowNumber}
          </span>
        ) : (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
            File
          </span>
        )}
        {issue.field ? (
          <span
            className={`shrink-0 text-[11px] font-semibold ${isError ? "text-red-700" : "text-amber-700"}`}
          >
            {issue.field}
          </span>
        ) : null}
        <span className={isError ? "text-red-800" : "text-amber-900"}>
          {issue.message}
        </span>
      </div>
      {issue.suggestedFix ? (
        <p className="pl-[4.5rem] text-xs text-gray-500">
          {issue.suggestedFix}
        </p>
      ) : null}
    </li>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CameraValidationReport({ result, onReupload }: Props) {
  const [errors, warnings] = partition(
    result.issues,
    (i) => i.severity === "error",
  );
  const isApproved = result.state === "approved";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isApproved
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${
                isApproved
                  ? "bg-green-100 text-green-800 ring-green-200"
                  : "bg-red-100 text-red-800 ring-red-200"
              }`}
              role="status"
            >
              {VALIDATION_STATE_LABEL[result.state]}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {isApproved ? "File validated successfully" : "File needs attention"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {result.parsedRowCount} camera{result.parsedRowCount !== 1 ? "s" : ""}{" "}
            reviewed from{" "}
            <span className="font-medium">{result.fileName}</span>
            {" · "}
            {errors.length > 0
              ? `${errors.length} error${errors.length !== 1 ? "s" : ""}`
              : "No errors"}
            {warnings.length > 0
              ? `, ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onReupload}
          className="inline-flex min-h-9 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {isApproved ? "Re-upload" : "Fix and re-upload"}
        </button>
      </div>

      {/* AI insights */}
      {result.aiInsights ? (
        <p className="mt-3 text-sm text-gray-700 italic">{result.aiInsights}</p>
      ) : null}

      {/* Errors section */}
      {errors.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-red-800">
            Errors — must be corrected before continuing ({errors.length})
          </h4>
          <ul className="mt-2 space-y-2.5">
            {errors.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Warnings section */}
      {warnings.length > 0 ? (
        <div className={`${errors.length > 0 ? "mt-5 border-t border-amber-200 pt-4" : "mt-4"}`}>
          <h4 className="text-sm font-semibold text-amber-800">
            Suggestions — review when possible ({warnings.length})
          </h4>
          <p className="mt-0.5 text-xs text-gray-500">
            These items won&apos;t block submission but addressing them improves deployment accuracy.
          </p>
          <ul className="mt-2 space-y-2.5">
            {warnings.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Success state */}
      {isApproved && errors.length === 0 && warnings.length === 0 ? (
        <p className="mt-3 text-sm text-green-800">
          All {result.parsedRowCount} camera{result.parsedRowCount !== 1 ? "s" : ""} passed validation. You&apos;re good to continue.
        </p>
      ) : null}

      {isApproved && warnings.length > 0 ? (
        <p className="mt-3 text-sm text-green-800">
          No blocking errors found. You can continue — addressing the suggestions above will improve onsite accuracy.
        </p>
      ) : null}
    </div>
  );
}

// ── Validating state placeholder ──────────────────────────────────────────────

export function CameraValidatingPlaceholder() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <svg
          className="h-5 w-5 animate-spin text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900">Validating…</p>
          <p className="mt-0.5 text-xs text-blue-700">
            Checking your camera data for issues. This takes a moment.
          </p>
        </div>
      </div>
    </div>
  );
}

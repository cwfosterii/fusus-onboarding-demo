"use client";

import { useCallback } from "react";
import {
  CAMERA_FIELD_SCHEMA,
  defaultCameraRow,
  validateCameraRow,
  type CameraRow,
} from "@/lib/camera-schema";

type Props = {
  rows: CameraRow[];
  onChange: (rows: CameraRow[]) => void;
  /** When true, highlight invalid fields on each row */
  showValidationErrors?: boolean;
  disabled?: boolean;
};

// ── Styles — matched to AgencyPointsOfContactForm ────────────────────────────

const inputClass =
  "mt-1.5 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

const inputErrorClass =
  "mt-1.5 h-10 w-full rounded-lg border border-red-400 px-3 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-50 disabled:text-gray-500";

const labelClass = "text-sm font-medium text-gray-800";

const fieldCellClass = "flex min-w-0 flex-col";

// ── Field layout — 3 columns per row, logically grouped ──────────────────────
//   Row 1: identity   — Camera Name · Make · Model
//   Row 2: placement  — Location · Floor · Type
//   Row 3: access     — Disposition · IP Address · Username
//   Row 4: meta       — Password · Lat/Lon · AI

const FIELD_ROWS: string[][] = [
  ["cameraName", "make", "model"],
  ["location", "floor", "type"],
  ["disposition", "ipAddress", "username"],
  ["password", "latLon", "ai"],
];

export function CameraDocumentationForm({
  rows,
  onChange,
  showValidationErrors,
  disabled,
}: Props) {
  const addRow = useCallback(() => {
    onChange([...rows, defaultCameraRow()]);
  }, [rows, onChange]);

  const removeRow = useCallback(
    (clientKey: string) => {
      onChange(rows.filter((r) => r.clientKey !== clientKey));
    },
    [rows, onChange],
  );

  const updateField = useCallback(
    (clientKey: string, fieldKey: string, value: string) => {
      onChange(
        rows.map((r) =>
          r.clientKey === clientKey ? { ...r, [fieldKey]: value } : r,
        ),
      );
    },
    [rows, onChange],
  );

  return (
    <div className="space-y-8">
      {/* Intro — matches Agency POC helper text style */}
      <div className="space-y-1 text-sm text-gray-600">
        <p>
          Enter one camera at a time, or upload a spreadsheet if you already
          have a list.
        </p>
        <p>
          All fields are optional in this phase — fill in as much as you have
          available. Both paths share the same data model, so you can switch
          between them without losing your work.
        </p>
      </div>

      {rows.map((row, idx) => {
        const errors = showValidationErrors ? validateCameraRow(row) : {};

        return (
          <div key={row.clientKey} className="space-y-4">
            {/* Card header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Camera {idx + 1}
              </h3>
              {rows.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeRow(row.clientKey)}
                  className="text-sm font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                  aria-label={`Remove camera ${idx + 1}`}
                >
                  Remove
                </button>
              ) : null}
            </div>

            {/* Field rows */}
            <div className="space-y-4">
              {FIELD_ROWS.map((rowKeys, rIdx) => {
                const fields = rowKeys
                  .map((k) => CAMERA_FIELD_SCHEMA.find((f) => f.key === k))
                  .filter(Boolean) as (typeof CAMERA_FIELD_SCHEMA)[number][];

                return (
                  <div
                    key={rIdx}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                  >
                    {fields.map((field) => {
                      const invalid = Boolean(errors[field.key]);
                      const value = row[field.key] ?? "";

                      return (
                        <div key={field.key} className={fieldCellClass}>
                          <label
                            htmlFor={`${row.clientKey}-${field.key}`}
                            className={labelClass}
                          >
                            {field.label}
                          </label>
                          <input
                            id={`${row.clientKey}-${field.key}`}
                            type={field.type}
                            disabled={disabled}
                            value={value}
                            onChange={(e) =>
                              updateField(row.clientKey, field.key, e.target.value)
                            }
                            placeholder={field.placeholder}
                            autoComplete={field.key === "password" ? "off" : undefined}
                            aria-invalid={invalid || undefined}
                            className={invalid ? inputErrorClass : inputClass}
                          />
                          {field.helperText ? (
                            <p className="mt-1 text-xs text-gray-400">
                              {field.helperText}
                            </p>
                          ) : null}
                          {invalid ? (
                            <p
                              className="mt-1 text-xs text-red-600"
                              role="alert"
                            >
                              {errors[field.key]}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Per-card add button — mirrors Agency POC's inline add */}
            <div>
              <button
                type="button"
                disabled={disabled}
                onClick={addRow}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add another camera
              </button>
            </div>

            {/* Divider between cards */}
            {idx < rows.length - 1 ? (
              <hr className="border-gray-200" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

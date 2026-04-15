"use client";

import type { DataInputMode } from "@/lib/readiness-data-input";

type Props = {
  value: DataInputMode;
  onChange: (mode: DataInputMode) => void;
  disabled?: boolean;
  /** Override default question copy */
  question?: string;
};

const cardBase =
  "relative flex cursor-pointer flex-col rounded-xl border p-4 text-left shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2";
const cardIdle =
  "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80";
const cardSelected = "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500";

export function DataInputModeSelector({
  value,
  onChange,
  disabled,
  question = "How would you like to provide this information?",
}: Props) {
  return (
    <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
      <legend className="text-sm font-semibold text-gray-900">{question}</legend>
      <p className="mt-1 text-xs text-gray-500">
        You can switch modes anytime; your progress in each path is saved in this
        browser until you submit.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={`${cardBase} ${value === "manual" ? cardSelected : cardIdle}`}>
          <input
            type="radio"
            name="data-input-mode"
            value="manual"
            checked={value === "manual"}
            onChange={() => onChange("manual")}
            className="sr-only"
          />
          <span className="text-sm font-semibold text-gray-900">
            Enter manually
          </span>
          <span className="mt-1 text-xs leading-relaxed text-gray-600">
            Best for smaller deployments — guided fields with clear requirements.
          </span>
        </label>
        <label
          className={`${cardBase} ${value === "template" ? cardSelected : cardIdle}`}
        >
          <input
            type="radio"
            name="data-input-mode"
            value="template"
            checked={value === "template"}
            onChange={() => onChange("template")}
            className="sr-only"
          />
          <span className="text-sm font-semibold text-gray-900">
            Download template / upload spreadsheet
          </span>
          <span className="mt-1 text-xs leading-relaxed text-gray-600">
            Best for larger deployments — fill a CSV or Excel template offline,
            then upload here.
          </span>
        </label>
      </div>
    </fieldset>
  );
}

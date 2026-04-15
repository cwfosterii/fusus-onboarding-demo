"use client";

import type { TaskFormField } from "@/lib/task-workflow-config";

type Props = {
  fields: TaskFormField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  /** When true, highlight empty required fields */
  showRequiredErrors?: boolean;
  disabled?: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const inputErrorClass = "border-red-400 focus:border-red-500 focus:ring-red-500";

const labelClass = "text-sm font-medium text-gray-800";

function fieldInvalid(
  field: TaskFormField,
  values: Record<string, string>,
): boolean {
  if (!field.required) return false;
  const v = values[field.name]?.trim();
  return !v;
}

function gridSpanClass(field: TaskFormField): string {
  if (field.type === "textarea" || field.type === "file") {
    return "md:col-span-2";
  }
  return "md:col-span-1";
}

export function ManualEntryForm({
  fields,
  values,
  onChange,
  showRequiredErrors,
  disabled,
}: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">Manual entry</h3>
      <p className="mt-1 text-xs text-gray-500">
        Required fields are marked with{" "}
        <span className="text-red-500">*</span>. Values are saved in this browser
        as you type.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const invalid = showRequiredErrors && fieldInvalid(field, values);
          const controlClass = `${inputClass} ${invalid ? inputErrorClass : ""}`;

          return (
            <div key={field.name} className={`min-w-0 ${gridSpanClass(field)}`}>
              <label htmlFor={field.name} className={labelClass}>
                {field.label}
                {field.required ? (
                  <span className="text-red-500" aria-hidden>
                    {" "}
                    *
                  </span>
                ) : null}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  disabled={disabled}
                  value={values[field.name] ?? ""}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  aria-invalid={invalid || undefined}
                  className={controlClass}
                />
              ) : field.type === "file" ? (
                <input
                  id={field.name}
                  name={field.name}
                  type="file"
                  disabled={disabled}
                  accept={field.accept}
                  aria-invalid={invalid || undefined}
                  className={controlClass}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    onChange(field.name, f ? f.name : "");
                  }}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  disabled={disabled}
                  value={values[field.name] ?? ""}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  aria-invalid={invalid || undefined}
                  className={controlClass}
                />
              )}
              {invalid ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  This field is required.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

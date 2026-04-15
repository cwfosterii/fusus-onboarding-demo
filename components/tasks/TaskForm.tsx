"use client";

import type { TaskFormField } from "@/lib/task-workflow-config";

type Props = {
  fields: TaskFormField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function TaskForm({ fields, values, onChange }: Props) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="text-sm font-medium text-gray-800"
          >
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
              value={values[field.name] ?? ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={inputClass}
            />
          ) : field.type === "file" ? (
            <input
              id={field.name}
              name={field.name}
              type="file"
              className={inputClass}
              accept={field.accept}
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
              value={values[field.name] ?? ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={inputClass}
            />
          )}
        </div>
      ))}
    </div>
  );
}

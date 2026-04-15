import type { TaskStatus } from "@/lib/task-workflow-config";

const LABEL: Record<TaskStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  complete: "Completed",
};

const STYLE: Record<TaskStatus, string> = {
  "not-started": "bg-slate-100 text-slate-700 ring-slate-200",
  "in-progress": "bg-amber-50 text-amber-900 ring-amber-200",
  complete: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-inset ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}

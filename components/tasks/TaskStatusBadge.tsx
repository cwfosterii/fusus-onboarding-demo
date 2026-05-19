import {
  taskLifecycleBadgeClass,
  TASK_LIFECYCLE_LABEL,
  type TaskLifecycleState,
} from "@/lib/task-lifecycle";

export function TaskStatusBadge({ status }: { status: TaskLifecycleState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-inset ${taskLifecycleBadgeClass(status)}`}
    >
      {TASK_LIFECYCLE_LABEL[status]}
    </span>
  );
}

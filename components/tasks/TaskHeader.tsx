import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import type { TaskLifecycleState } from "@/lib/task-lifecycle";

type Props = {
  title: string;
  intro: string;
  group: string;
  taskIndex: number;
  totalTasks: number;
  status: TaskLifecycleState;
};

export function TaskHeader({
  title,
  intro,
  group,
  taskIndex,
  totalTasks,
  status,
}: Props) {
  return (
    <header className="border-b border-gray-100 pb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {group} · Task {taskIndex} of {totalTasks}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-gray-600">{intro}</p>
        </div>
        <TaskStatusBadge status={status} />
      </div>
    </header>
  );
}

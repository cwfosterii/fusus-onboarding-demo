"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DeploymentFilterId, DeploymentViewModel } from "@/lib/deployment-types";
import {
  deploymentMatchesFilters,
  getDeployments,
} from "@/lib/deployment-repository";

const FILTER_OPTIONS: { id: DeploymentFilterId; label: string }[] = [
  { id: "readyToSchedule", label: "Ready to schedule" },
  { id: "openSteps", label: "Open tasks" },
  { id: "inProgress", label: "In progress" },
  { id: "complete", label: "Complete" },
];

function scheduleLabel(status: DeploymentViewModel["scheduleStatus"]) {
  if (status === "submitted") return "Submitted";
  if (status === "confirmed") return "Confirmed";
  return "Not scheduled";
}

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<DeploymentViewModel[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Set<DeploymentFilterId>>(new Set());

  const refresh = useCallback(() => {
    setRows(getDeployments());
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from repository on mount */
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(
    () =>
      rows.filter((d) => deploymentMatchesFilters(d, search, filters)),
    [rows, search, filters],
  );

  const toggleFilter = (id: DeploymentFilterId) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              PSO
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Admin dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Customer deployments — local demo data wired like a future API
              client.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 underline"
          >
            ← Back to customer dashboard
          </Link>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <input
            type="search"
            placeholder="Search by agency name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => {
              const on = filters.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFilter(f.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Current task</th>
                <th className="px-4 py-3">Readiness</th>
                <th className="px-4 py-3">Steps left</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Onsite date</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/${d.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {d.agencyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{d.currentStepTitle}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      {d.readinessPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.remainingStepCount === 0 ? (
                      <span className="text-green-700">0</span>
                    ) : (
                      <span className="text-red-600">{d.remainingStepCount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-700">
                        {scheduleLabel(d.scheduleStatus)}
                      </span>
                      {d.flags.readyToSchedule ? (
                        <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
                          Schedule onsite
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.onsiteDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/${d.id}`}
                      className="text-xs font-medium text-blue-600 underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              No deployments match your search or filters.
            </p>
          ) : null}
        </div>

        <div className="space-y-3 md:hidden">
          {filtered.map((d) => (
            <Link
              key={d.id}
              href={`/admin/${d.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{d.agencyName}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Current task: {d.currentStepTitle}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {d.readinessPercent}%
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                <span>
                  Steps left:{" "}
                  <strong
                    className={
                      d.remainingStepCount ? "text-red-600" : "text-green-700"
                    }
                  >
                    {d.remainingStepCount}
                  </strong>
                </span>
                <span>·</span>
                <span>{scheduleLabel(d.scheduleStatus)}</span>
                {d.onsiteDate ? (
                  <>
                    <span>·</span>
                    <span>Onsite {d.onsiteDate}</span>
                  </>
                ) : null}
              </div>
              {d.flags.readyToSchedule ? (
                <div className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
                  Schedule onsite
                </div>
              ) : d.remainingStepCount > 0 ? (
                <p className="mt-2 text-xs text-red-600">
                  {d.remainingSteps[0]?.title}
                  {d.remainingSteps.length > 1
                    ? ` +${d.remainingSteps.length - 1} more`
                    : ""}
                </p>
              ) : null}
            </Link>
          ))}
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              No deployments match your search or filters.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

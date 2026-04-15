"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { attachLatestScheduleRequestToDemoCustomer } from "@/lib/deployment-repository";
import { isAllTasksComplete } from "@/lib/task-progress-storage";

const REQUEST_KEY = "fusus-onsite-request";

type FormState = {
  agencyName: string;
  preferredDate: string;
  preferredTime: string;
  onsiteContact: string;
  notes: string;
};

const emptyForm: FormState = {
  agencyName: "",
  preferredDate: "",
  preferredTime: "",
  onsiteContact: "",
  notes: "",
};

function readEligible(): boolean {
  return isAllTasksComplete();
}

export default function ScheduleOnsitePage() {
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- read eligibility after mount */
  useEffect(() => {
    setEligible(readEligible());
    setEligibilityChecked(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const fieldClass =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const labelClass = "text-sm font-medium text-gray-700";

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!eligible) return;
      const payload = {
        ...form,
        submittedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(REQUEST_KEY, JSON.stringify(payload));
      attachLatestScheduleRequestToDemoCustomer();
      setSubmitted(true);
    },
    [eligible, form],
  );

  let body: ReactNode;

  if (!eligibilityChecked) {
    body = (
      <p className="text-sm text-gray-500" role="status">
        Checking eligibility…
      </p>
    );
  } else if (!eligible) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Scheduling opens after every guided task is complete. Finish any
          remaining tasks from the dashboard, then return here.
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-blue-600 underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  } else if (submitted) {
    body = (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Request received</p>
          <p className="mt-2">
            Thanks — your onsite details were saved locally for this demo. A
            PSO coordinator will follow up using the contact you provided.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-blue-600 underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  } else {
    body = (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="agencyName" className={labelClass}>
            Agency name
          </label>
          <input
            id="agencyName"
            name="agencyName"
            required
            className={fieldClass}
            value={form.agencyName}
            onChange={(e) =>
              setForm((f) => ({ ...f, agencyName: e.target.value }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="preferredDate" className={labelClass}>
              Preferred onsite date
            </label>
            <input
              id="preferredDate"
              name="preferredDate"
              type="date"
              required
              className={fieldClass}
              value={form.preferredDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, preferredDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="preferredTime" className={labelClass}>
              Preferred onsite time
            </label>
            <input
              id="preferredTime"
              name="preferredTime"
              type="time"
              required
              className={fieldClass}
              value={form.preferredTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, preferredTime: e.target.value }))
              }
            />
          </div>
        </div>

        <div>
          <label htmlFor="onsiteContact" className={labelClass}>
            Onsite owner / contact
          </label>
          <input
            id="onsiteContact"
            name="onsiteContact"
            required
            placeholder="Name, role, phone or email"
            className={fieldClass}
            value={form.onsiteContact}
            onChange={(e) =>
              setForm((f) => ({ ...f, onsiteContact: e.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>
            Notes / special requirements
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className={fieldClass}
            placeholder="Access, badging, parking, room needs…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Submit request
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <Link href="/" className="text-sm text-blue-600 underline">
          ← Back to dashboard
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Schedule onsite</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tell us how to plan your working session. No server yet — details
            are stored in your browser for this demo.
          </p>

          <div className="mt-6">{body}</div>
        </div>
      </div>
    </main>
  );
}

"use client";

import {
  insertContactAfter,
  type AgencyContactFields,
  type AgencyPocFormData,
} from "@/lib/agency-poc-form";

type Props = {
  value: AgencyPocFormData;
  onChange: (next: AgencyPocFormData) => void;
  disabled?: boolean;
};

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const labelClass = "text-sm font-medium text-gray-800";

const fieldCellClass = "flex min-w-0 flex-col";

function patchContactAt(
  prev: AgencyPocFormData,
  index: number,
  field: keyof AgencyContactFields,
  v: string,
): AgencyPocFormData {
  const contacts = prev.contacts.map((c, i) =>
    i === index ? { ...c, [field]: v } : c,
  );
  return { contacts };
}

function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden>
      {" "}
      *
    </span>
  );
}

export function AgencyPointsOfContactForm({
  value,
  onChange,
  disabled,
}: Props) {
  const patch = (
    index: number,
    field: keyof AgencyContactFields,
    v: string,
  ) => onChange(patchContactAt(value, index, field, v));

  const addAfter = (afterIndex: number) =>
    onChange(insertContactAfter(value, afterIndex));

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          Provide points of contact for deployment coordination. Add more
          contacts if multiple people will coordinate IT, credentials, or
          scheduling.
        </p>
        <p>
          Choose people who can respond quickly. Each listed contact must
          include first name, last name, and email.
        </p>
      </div>

      {value.contacts.map((contact, index) => {
        const idBase = `poc-${contact.clientKey}`;
        return (
        <div key={contact.clientKey} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Contact {index + 1}
            </h3>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={fieldCellClass}>
                  <label
                    htmlFor={`${idBase}-title`}
                    className={labelClass}
                  >
                    Rank/Title
                  </label>
                  <input
                    id={`${idBase}-title`}
                    type="text"
                    disabled={disabled}
                    value={contact.title}
                    onChange={(e) => patch(index, "title", e.target.value)}
                    className={`${inputClass} mt-1.5 w-full`}
                    autoComplete="organization-title"
                  />
                </div>
                <div className={fieldCellClass}>
                  <label
                    htmlFor={`${idBase}-first`}
                    className={labelClass}
                  >
                    First Name
                    <RequiredMark />
                  </label>
                  <input
                    id={`${idBase}-first`}
                    type="text"
                    disabled={disabled}
                    value={contact.firstName}
                    onChange={(e) =>
                      patch(index, "firstName", e.target.value)
                    }
                    className={`${inputClass} mt-1.5 w-full`}
                    autoComplete="given-name"
                  />
                </div>
                <div className={fieldCellClass}>
                  <label
                    htmlFor={`${idBase}-last`}
                    className={labelClass}
                  >
                    Last Name
                    <RequiredMark />
                  </label>
                  <input
                    id={`${idBase}-last`}
                    type="text"
                    disabled={disabled}
                    value={contact.lastName}
                    onChange={(e) =>
                      patch(index, "lastName", e.target.value)
                    }
                    className={`${inputClass} mt-1.5 w-full`}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={fieldCellClass}>
                  <label
                    htmlFor={`${idBase}-email`}
                    className={labelClass}
                  >
                    Email
                    <RequiredMark />
                  </label>
                  <input
                    id={`${idBase}-email`}
                    type="email"
                    disabled={disabled}
                    value={contact.email}
                    onChange={(e) =>
                      patch(index, "email", e.target.value)
                    }
                    className={`${inputClass} mt-1.5 w-full`}
                    autoComplete="email"
                  />
                </div>
                <div className={fieldCellClass}>
                  <label
                    htmlFor={`${idBase}-phone`}
                    className={labelClass}
                  >
                    Phone
                  </label>
                  <input
                    id={`${idBase}-phone`}
                    type="tel"
                    disabled={disabled}
                    value={contact.phone}
                    onChange={(e) =>
                      patch(index, "phone", e.target.value)
                    }
                    className={`${inputClass} mt-1.5 w-full`}
                    autoComplete="tel"
                  />
                </div>
                <div className={fieldCellClass}>
                  <label
                    htmlFor={`${idBase}-role`}
                    className={labelClass}
                  >
                    Role
                  </label>
                  <input
                    id={`${idBase}-role`}
                    type="text"
                    disabled={disabled}
                    value={contact.role}
                    onChange={(e) =>
                      patch(index, "role", e.target.value)
                    }
                    className={`${inputClass} mt-1.5 w-full`}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => addAfter(index)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add additional contacts
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

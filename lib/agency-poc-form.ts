/**
 * Agency points-of-contact form — UI uses a flat list; POST maps to primary + additional.
 */

export type AgencyContactFields = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

/** One row in the form; `clientKey` is UI-only (stable list keys, not sent to API). */
export type AgencyPocContactRow = AgencyContactFields & { clientKey: string };

export type AgencyPocFormData = {
  contacts: AgencyPocContactRow[];
};

export const AGENCY_POC_TASK_ID = "agency-setup-pocs";

function newClientKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const emptyContact = (): AgencyContactFields => ({
  title: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
});

export function newContactRow(): AgencyPocContactRow {
  return { ...emptyContact(), clientKey: newClientKey() };
}

export function defaultAgencyPocFormData(): AgencyPocFormData {
  return { contacts: [newContactRow()] };
}

function toApiContact(row: AgencyPocContactRow): AgencyContactFields {
  return {
    title: row.title,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    role: row.role,
  };
}

/** POST body `data` — matches prior API contract. */
export function toAgencyPocApiPayload(data: AgencyPocFormData): {
  primaryContact: AgencyContactFields;
  additionalContacts: AgencyContactFields[];
} {
  const [primary, ...rest] =
    data.contacts.length > 0 ? data.contacts : [newContactRow()];
  return {
    primaryContact: toApiContact(primary ?? newContactRow()),
    additionalContacts: rest.map(toApiContact),
  };
}

export function insertContactAfter(
  data: AgencyPocFormData,
  afterIndex: number,
): AgencyPocFormData {
  const contacts = [...data.contacts];
  const insertAt = Math.min(Math.max(afterIndex + 1, 0), contacts.length);
  contacts.splice(insertAt, 0, newContactRow());
  return { contacts };
}

function mergeContact(
  base: AgencyContactFields,
  partial: Partial<Record<keyof AgencyContactFields, unknown>>,
): AgencyContactFields {
  const keys: (keyof AgencyContactFields)[] = [
    "title",
    "firstName",
    "lastName",
    "email",
    "phone",
    "role",
  ];
  const next = { ...base };
  for (const k of keys) {
    const v = partial[k];
    if (typeof v === "string") next[k] = v;
  }
  return next;
}

function rowFromFields(
  fields: AgencyContactFields,
  partial?: Record<string, unknown>,
): AgencyPocContactRow {
  const ck = partial?.clientKey;
  const key =
    typeof ck === "string" && ck.trim() ? ck.trim() : newClientKey();
  return { ...fields, clientKey: key };
}

function rowFromUnknown(partial: Record<string, unknown>): AgencyPocContactRow {
  return rowFromFields(mergeContact(emptyContact(), partial), partial);
}

function contactHasAnyData(c: AgencyContactFields): boolean {
  return (
    Boolean(c.title.trim()) ||
    Boolean(c.firstName.trim()) ||
    Boolean(c.lastName.trim()) ||
    Boolean(c.email.trim()) ||
    Boolean(c.phone.trim()) ||
    Boolean(c.role.trim())
  );
}

/** Migrate legacy flat or primary/secondary nested payloads. */
export function migrateLegacyAgencyPocFlat(
  raw: Record<string, unknown>,
): AgencyPocFormData {
  if (Array.isArray(raw.contacts)) {
    const list = raw.contacts
      .filter((c) => c && typeof c === "object")
      .map((c) => rowFromUnknown(c as Record<string, unknown>));
    if (list.length > 0) return { contacts: list };
  }

  if (raw.primaryContact && typeof raw.primaryContact === "object") {
    const p = mergeContact(
      emptyContact(),
      raw.primaryContact as Record<string, unknown>,
    );
    const contacts: AgencyPocContactRow[] = [rowFromFields(p)];
    if (raw.secondaryContact && typeof raw.secondaryContact === "object") {
      const s = mergeContact(
        emptyContact(),
        raw.secondaryContact as Record<string, unknown>,
      );
      if (contactHasAnyData(s)) contacts.push(rowFromFields(s));
    }
    return { contacts };
  }

  const primary = emptyContact();
  const primaryName =
    typeof raw.primaryName === "string" ? raw.primaryName.trim() : "";
  const parts = primaryName.split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    primary.firstName = parts[0] ?? "";
    primary.lastName = parts.slice(1).join(" ");
  }
  if (typeof raw.primaryEmail === "string") primary.email = raw.primaryEmail;
  if (typeof raw.primaryPhone === "string") primary.phone = raw.primaryPhone;

  const secondary = emptyContact();
  const secondaryName =
    typeof raw.secondaryName === "string" ? raw.secondaryName.trim() : "";
  const sParts = secondaryName.split(/\s+/).filter(Boolean);
  if (sParts.length > 0) {
    secondary.firstName = sParts[0] ?? "";
    secondary.lastName = sParts.slice(1).join(" ");
  }
  if (typeof raw.secondaryEmail === "string")
    secondary.email = raw.secondaryEmail;

  const contacts = [rowFromFields(primary)];
  if (contactHasAnyData(secondary)) contacts.push(rowFromFields(secondary));
  return { contacts };
}

export function parseAgencyPocFormJson(raw: string): AgencyPocFormData {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object")
      return defaultAgencyPocFormData();
    return migrateLegacyAgencyPocFlat(parsed as Record<string, unknown>);
  } catch {
    return defaultAgencyPocFormData();
  }
}

export function isAgencyPocFormValid(data: AgencyPocFormData): boolean {
  if (!data.contacts.length) return false;
  return data.contacts.every(
    (c) =>
      Boolean(c.firstName.trim()) &&
      Boolean(c.lastName.trim()) &&
      Boolean(c.email.trim()),
  );
}

const STORAGE_KEY = `fusus-task-form-${AGENCY_POC_TASK_ID}`;

export function readAgencyPocFromStorage(): AgencyPocFormData {
  if (typeof window === "undefined") return defaultAgencyPocFormData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultAgencyPocFormData();
  return parseAgencyPocFormJson(raw);
}

export function writeAgencyPocToStorage(data: AgencyPocFormData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Central schema for Camera Documentation fields.
 *
 * This is the single source of truth for:
 *   - Manual entry form field definitions
 *   - Spreadsheet template column headers (customer-facing workbook)
 *   - Validation rules (enforced per-field; all optional in Phase 1)
 *   - Future API payload shape
 *
 * To enforce a field as required in production, set `required: true` here
 * (or override per-customer without changing the component layer).
 */

export type CameraFieldSchema = {
  /** Stable key used in form state, localStorage, and API payload */
  key: string;
  /** Human-readable label shown in the manual-entry form */
  label: string;
  /** Column header exactly as it appears in the customer-facing template */
  templateHeader: string;
  /** Input type */
  type: "text" | "password";
  /**
   * All fields are false in Phase 1.
   * Flip to true per deployment without redesigning the form.
   */
  required: boolean;
  placeholder?: string;
  /** Rendered as a subtle hint below the input */
  helperText?: string;
  validationRules?: {
    /** Regex source string (use new RegExp(pattern) to test) */
    pattern?: string;
    patternMessage?: string;
  };
};

export const CAMERA_FIELD_SCHEMA: readonly CameraFieldSchema[] = [
  {
    key: "cameraName",
    label: "Camera Name",
    templateHeader: "Camera Name",
    type: "text",
    required: false,
    placeholder: "e.g. Front Entrance – Cam 1",
  },
  {
    key: "make",
    label: "Make",
    templateHeader: "Make",
    type: "text",
    required: false,
    placeholder: "e.g. Axis, Hikvision, Hanwha",
  },
  {
    key: "model",
    label: "Model",
    templateHeader: "Model",
    type: "text",
    required: false,
    placeholder: "e.g. P3245-V",
  },
  {
    key: "location",
    label: "Location",
    templateHeader: "Location",
    type: "text",
    required: false,
    placeholder: "e.g. Main Lobby",
  },
  {
    key: "floor",
    label: "Floor",
    templateHeader: "Floor",
    type: "text",
    required: false,
    placeholder: "e.g. 1, 2, Basement",
  },
  {
    key: "type",
    label: "Type",
    templateHeader: "Type",
    type: "text",
    required: false,
    placeholder: "e.g. Fixed, PTZ, Fisheye",
  },
  {
    key: "disposition",
    label: "Disposition",
    templateHeader: "Disposition",
    type: "text",
    required: false,
    placeholder: "e.g. Indoor, Outdoor",
  },
  {
    key: "ipAddress",
    label: "IP Address",
    templateHeader: "IP Address",
    type: "text",
    required: false,
    placeholder: "e.g. 192.168.1.100",
    validationRules: {
      pattern: "^(\\d{1,3}\\.){3}\\d{1,3}$",
      patternMessage: "Enter a valid IPv4 address",
    },
  },
  {
    key: "username",
    label: "Username",
    templateHeader: "Username",
    type: "text",
    required: false,
    placeholder: "Camera login username",
  },
  {
    key: "password",
    label: "Password",
    templateHeader: "Password",
    type: "password",
    required: false,
    placeholder: "Camera login password",
  },
  {
    key: "latLon",
    label: "Lat / Lon",
    templateHeader: "Lat_Lon",
    type: "text",
    required: false,
    placeholder: "33.4484, -112.0740",
    helperText: "Decimal degrees, comma-separated",
  },
  {
    key: "ai",
    label: "AI",
    templateHeader: "AI",
    type: "text",
    required: false,
    placeholder: "e.g. Yes, No, Analytics only",
    helperText: "Whether AI / analytics is enabled on this camera",
  },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type CameraFieldKey = (typeof CAMERA_FIELD_SCHEMA)[number]["key"];

export type CameraRowValues = Record<CameraFieldKey, string>;

export type CameraRow = CameraRowValues & {
  /** Stable browser-local key for React list rendering (never sent to API) */
  clientKey: string;
};

// ── Row helpers ───────────────────────────────────────────────────────────────

export function defaultCameraRow(): CameraRow {
  const empty = Object.fromEntries(
    CAMERA_FIELD_SCHEMA.map((f) => [f.key, ""]),
  ) as CameraRowValues;
  return {
    clientKey:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    ...empty,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Returns field-keyed error messages for a single camera row. */
export function validateCameraRow(
  row: CameraRow,
): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const field of CAMERA_FIELD_SCHEMA) {
    const value = (row[field.key as CameraFieldKey] ?? "").trim();
    if (field.required && !value) {
      errors[field.key] = "This field is required.";
    } else if (value && field.validationRules?.pattern) {
      if (!new RegExp(field.validationRules.pattern).test(value)) {
        errors[field.key] =
          field.validationRules.patternMessage ?? "Invalid format.";
      }
    }
  }
  return errors;
}

export function isCameraRowValid(row: CameraRow): boolean {
  return Object.keys(validateCameraRow(row)).length === 0;
}

/** Phase 1: all fields optional, so any list (including empty) is valid. */
export function isCameraListValid(rows: CameraRow[]): boolean {
  return rows.every(isCameraRowValid);
}

// ── Template CSV ──────────────────────────────────────────────────────────────

/** Column headers exactly as they appear in the customer-facing workbook. */
export const CAMERA_TEMPLATE_HEADERS: string[] = CAMERA_FIELD_SCHEMA.map(
  (f) => f.templateHeader,
);

/** Generates a downloadable CSV from the schema (schema is the source of truth). */
export function generateCameraTemplateCsv(): string {
  const headers = CAMERA_TEMPLATE_HEADERS.join(",");
  // Sample rows mirror the customer-facing workbook
  const rows: string[][] = [
    ["01 Main Entrance", "Axis", "M1034-LW", "Front Desk", "First", "PTZ", "External", "10.1.1.4", "admin", "admin", "99.999999,-99.99999", "Yes"],
    ["01 Side Entrance - View 1 (East)", "Axis", "M1034-LW", "Side Desk", "First", "Fixed", "Internal", "", "admin", "admin", "99.999999,-99.99999", "No"],
    ["02 Side Entrance - View 2 (West)", "Axis", "M1034-LW", "Side Desk", "First", "Fixed", "Internal", "10.1.1.7", "admin", "admin", "99.999999,-99.99999", "No"],
  ];
  const csv = [
    headers,
    ...rows.map((cells) =>
      cells.map((v) => (v.includes(",") ? `"${v}"` : v)).join(","),
    ),
  ].join("\n");
  return `${csv}\n`;
}

export const CAMERA_TEMPLATE_FILENAME = "camera_template.csv";

// ── localStorage ──────────────────────────────────────────────────────────────

function cameraStorageKey(taskId: string): string {
  return `fusus-camera-docs-${taskId}`;
}

export function readCameraListFromStorage(taskId: string): CameraRow[] {
  if (typeof window === "undefined") return [defaultCameraRow()];
  const raw = window.localStorage.getItem(cameraStorageKey(taskId));
  if (!raw) return [defaultCameraRow()];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0)
      return [defaultCameraRow()];
    return parsed as CameraRow[];
  } catch {
    return [defaultCameraRow()];
  }
}

export function writeCameraListToStorage(
  taskId: string,
  rows: CameraRow[],
): void {
  window.localStorage.setItem(cameraStorageKey(taskId), JSON.stringify(rows));
}

/**
 * Camera upload validation engine.
 *
 * Architecture:
 *   1. Client parses the uploaded file → CameraRow[]
 *   2. runDeterministicValidation() runs hard + warning rules synchronously
 *   3. If no hard errors, the AI endpoint is called for soft review
 *   4. Results are merged into CameraValidationResult and persisted to localStorage
 *
 * Rule priority: hard errors block completion; warnings surface but never block.
 */

import type { CameraRow } from "@/lib/camera-schema";
import { CAMERA_FIELD_SCHEMA } from "@/lib/camera-schema";

// ── State ─────────────────────────────────────────────────────────────────────

export type CameraUploadValidationState =
  | "not_started"
  | "validating"
  | "approved"
  | "needs_attention";

export const VALIDATION_STATE_LABEL: Record<
  CameraUploadValidationState,
  string
> = {
  not_started: "Not started",
  validating: "Validating…",
  approved: "Approved",
  needs_attention: "Needs Attention",
};

// ── Issue types ───────────────────────────────────────────────────────────────

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  /** Row number shown to customer (1-based; -1 = file-level) */
  rowNumber: number;
  field?: string;
  severity: ValidationSeverity;
  /** Machine-readable code — allows deduplication and future config */
  code: string;
  /** Customer-facing message */
  message: string;
  suggestedFix?: string;
};

// ── Result ────────────────────────────────────────────────────────────────────

export type CameraValidationResult = {
  state: CameraUploadValidationState;
  issues: ValidationIssue[];
  parsedRowCount: number;
  fileName: string;
  validatedAt: string;
  /** Narrative summary from AI review */
  aiInsights?: string;
};

export function deriveState(
  issues: ValidationIssue[],
): CameraUploadValidationState {
  return issues.some((i) => i.severity === "error")
    ? "needs_attention"
    : "approved";
}

// ── Placeholder detection ─────────────────────────────────────────────────────

const PLACEHOLDER_LOWER = new Set([
  "test",
  "testing",
  "n/a",
  "na",
  "unknown",
  "tbd",
  "todo",
  "temp",
  "placeholder",
  "example",
  "sample",
  "xxx",
  "yyy",
  "zzz",
  "foo",
  "bar",
  "changeme",
  "replace",
  "enter here",
  "fill in",
  "to be determined",
]);

function isPlaceholder(v: string): boolean {
  return PLACEHOLDER_LOWER.has(v.toLowerCase().trim());
}

// ── IP address ────────────────────────────────────────────────────────────────

function parseIpv4(v: string): number[] | null {
  const parts = v.trim().split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return null;
  return octets;
}

function isValidIpv4(v: string): boolean {
  return parseIpv4(v) !== null;
}

function isPlaceholderIp(v: string): boolean {
  return v.trim() === "0.0.0.0" || v.trim() === "255.255.255.255";
}

// ── Lat/Lon ───────────────────────────────────────────────────────────────────

function parseLatLon(
  v: string,
): { lat: number; lon: number } | null {
  const parts = v
    .replace(/[;|/]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

function isValidLatLon(v: string): boolean {
  const coords = parseLatLon(v);
  if (!coords) return false;
  return (
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lon >= -180 &&
    coords.lon <= 180
  );
}

function isImpossibleCoord(v: string): boolean {
  const coords = parseLatLon(v);
  if (!coords) return false;
  // Null Island or clearly impossible
  if (coords.lat === 0 && coords.lon === 0) return true;
  if (Math.abs(coords.lat) > 90 || Math.abs(coords.lon) > 180) return true;
  return false;
}

// ── Vague location words ──────────────────────────────────────────────────────

const VAGUE_LOCATION_WORDS = [
  "intersection",
  "corner",
  "area",
  "location",
  "place",
  "spot",
  "somewhere",
  "outside",
  "inside",
  "building",
  "near",
];

function hasVagueLocation(v: string): boolean {
  const lower = v.toLowerCase();
  return VAGUE_LOCATION_WORDS.some((w) => lower === w || lower.startsWith(`${w} `));
}

// ── Configurable required fields ──────────────────────────────────────────────
// All false in Phase 1. To enforce per-deployment, set required: true on the
// corresponding CameraFieldSchema entry in camera-schema.ts.

function getRequiredFields(): string[] {
  return CAMERA_FIELD_SCHEMA.filter((f) => f.required).map((f) => f.key);
}

// ── Hard validation rules ─────────────────────────────────────────────────────

export function runDeterministicValidation(rows: CameraRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields = getRequiredFields();

  // Deduplication sets
  const seenNames = new Map<string, number>(); // normalised name → first rowNumber
  const seenIps = new Map<string, number>();
  const seenSignatures = new Map<string, number>();

  rows.forEach((row, idx) => {
    const rowNumber = idx + 1;

    // ── Required fields ──────────────────────────────────────────────────────
    for (const key of requiredFields) {
      const v = (row[key] ?? "").trim();
      if (!v) {
        const field = CAMERA_FIELD_SCHEMA.find((f) => f.key === key);
        issues.push({
          rowNumber,
          field: field?.label ?? key,
          severity: "error",
          code: "required_field_missing",
          message: `"${field?.label ?? key}" is required but was not provided.`,
        });
      }
    }

    // ── Placeholder values (any field) ───────────────────────────────────────
    for (const f of CAMERA_FIELD_SCHEMA) {
      const v = (row[f.key] ?? "").trim();
      if (v && isPlaceholder(v)) {
        issues.push({
          rowNumber,
          field: f.label,
          severity: "error",
          code: "placeholder_value",
          message: `"${f.label}" appears to contain placeholder text ("${v}"). Please replace with the actual value.`,
        });
      }
    }

    // ── IP address ───────────────────────────────────────────────────────────
    const ip = (row.ipAddress ?? "").trim();
    if (ip) {
      if (!isValidIpv4(ip)) {
        issues.push({
          rowNumber,
          field: "IP Address",
          severity: "error",
          code: "invalid_ip",
          message: `"${ip}" is not a valid IPv4 address. Use the format 192.168.1.100.`,
          suggestedFix: "Check the camera's network settings for the correct IP.",
        });
      } else if (isPlaceholderIp(ip)) {
        issues.push({
          rowNumber,
          field: "IP Address",
          severity: "error",
          code: "placeholder_ip",
          message: `"${ip}" is a placeholder address. Enter the camera's actual IP.`,
        });
      }
    }

    // ── Lat/Lon ──────────────────────────────────────────────────────────────
    const latLon = (row.latLon ?? "").trim();
    if (latLon) {
      if (!isValidLatLon(latLon)) {
        issues.push({
          rowNumber,
          field: "Lat / Lon",
          severity: "error",
          code: "invalid_lat_lon",
          message: `"${latLon}" is not a valid coordinate. Use decimal degrees separated by a comma, e.g. 33.4484, -112.0740.`,
          suggestedFix: "Copy coordinates from Google Maps in decimal format.",
        });
      } else if (isImpossibleCoord(latLon)) {
        issues.push({
          rowNumber,
          field: "Lat / Lon",
          severity: "error",
          code: "impossible_coordinates",
          message: `The coordinates (${latLon}) appear to be at an impossible or placeholder location. Please verify.`,
          suggestedFix: "Confirm the exact GPS coordinates with your field team.",
        });
      }
    }

    // ── Duplicate camera names ────────────────────────────────────────────────
    const nameKey = (row.cameraName ?? "").toLowerCase().trim();
    if (nameKey) {
      const prev = seenNames.get(nameKey);
      if (prev !== undefined) {
        issues.push({
          rowNumber,
          field: "Camera Name",
          severity: "error",
          code: "duplicate_camera_name",
          message: `Camera name "${row.cameraName}" appears on both row ${prev} and row ${rowNumber}. Each camera must have a unique name.`,
          suggestedFix:
            'Append a suffix like "- View 1" and "- View 2" to distinguish cameras at the same location.',
        });
      } else {
        seenNames.set(nameKey, rowNumber);
      }
    }

    // ── Duplicate IP addresses ────────────────────────────────────────────────
    if (ip && isValidIpv4(ip) && !isPlaceholderIp(ip)) {
      const prev = seenIps.get(ip);
      if (prev !== undefined) {
        issues.push({
          rowNumber,
          field: "IP Address",
          severity: "error",
          code: "duplicate_ip",
          message: `IP address "${ip}" appears on both row ${prev} and row ${rowNumber}. Each camera must have a unique IP.`,
          suggestedFix: "Verify the correct IP for each camera in your network settings.",
        });
      } else {
        seenIps.set(ip, rowNumber);
      }
    }

    // ── Duplicate rows (all fields identical) ────────────────────────────────
    const sig = CAMERA_FIELD_SCHEMA.map(
      (f) => (row[f.key] ?? "").trim(),
    ).join("|");
    const prevSig = seenSignatures.get(sig);
    if (prevSig !== undefined) {
      issues.push({
        rowNumber,
        field: undefined,
        severity: "error",
        code: "duplicate_row",
        message: `Row ${rowNumber} appears to be an exact duplicate of row ${prevSig}. Please remove or correct the duplicate entry.`,
        suggestedFix: "Delete one of the duplicate rows or update the camera details.",
      });
    } else {
      seenSignatures.set(sig, rowNumber);
    }
  });

  // ── Warning-level rules ───────────────────────────────────────────────────

  rows.forEach((row, idx) => {
    const rowNumber = idx + 1;

    // Missing floor
    const floor = (row.floor ?? "").trim();
    if (!floor) {
      issues.push({
        rowNumber,
        field: "Floor",
        severity: "warning",
        code: "missing_floor",
        message: `Floor is empty for camera "${row.cameraName || `row ${rowNumber}`}". This helps the install team locate cameras precisely.`,
        suggestedFix: 'Enter the floor number or label (e.g. "1", "2", "Roof").',
      });
    }

    // Vague location text
    const location = (row.location ?? "").trim();
    if (location && hasVagueLocation(location)) {
      issues.push({
        rowNumber,
        field: "Location",
        severity: "warning",
        code: "vague_location",
        message: `Location "${location}" is vague and may cause confusion during installation.`,
        suggestedFix: 'Use a specific location like "Main Lobby – East Wall" or "Parking Lot B – Entrance".',
      });
    }

    // Missing coordinates
    const latLon = (row.latLon ?? "").trim();
    if (!latLon) {
      issues.push({
        rowNumber,
        field: "Lat / Lon",
        severity: "warning",
        code: "missing_coordinates",
        message: `Coordinates are missing for camera "${row.cameraName || `row ${rowNumber}`}". GPS coordinates help map cameras in the Fusus platform.`,
        suggestedFix: "Add decimal degree coordinates. You can right-click a location in Google Maps to copy them.",
      });
    }

    // Missing IP address (warning only — required flag is off in Phase 1)
    const ip = (row.ipAddress ?? "").trim();
    if (!ip) {
      issues.push({
        rowNumber,
        field: "IP Address",
        severity: "warning",
        code: "missing_ip",
        message: `IP address is missing for camera "${row.cameraName || `row ${rowNumber}`}". It will be needed for integration.`,
        suggestedFix: "Enter the static IP assigned to this camera on your network.",
      });
    }

    // Default-looking password
    const pwd = (row.password ?? "").trim().toLowerCase();
    if (pwd && ["admin", "password", "12345", "123456", "1234"].includes(pwd)) {
      issues.push({
        rowNumber,
        field: "Password",
        severity: "warning",
        code: "weak_password",
        message: `Camera "${row.cameraName || `row ${rowNumber}`}" appears to use a default or common password. This is a security risk.`,
        suggestedFix: "Update the camera password to a strong, unique value before deployment.",
      });
    }
  });

  // ── Repeated make/model (file-level warning) ───────────────────────────────
  if (rows.length > 2) {
    const modelCounts = new Map<string, number>();
    for (const row of rows) {
      const mk = `${(row.make ?? "").trim()} ${(row.model ?? "").trim()}`.toLowerCase().trim();
      if (mk) modelCounts.set(mk, (modelCounts.get(mk) ?? 0) + 1);
    }
    for (const [combo, count] of modelCounts) {
      if (count === rows.length && rows.length >= 3) {
        issues.push({
          rowNumber: -1,
          severity: "warning",
          code: "all_same_model",
          message: `All ${rows.length} cameras share the same make/model (${combo}). Confirm this is intentional and not copied rows.`,
          suggestedFix: "Verify each row represents a unique physical camera.",
        });
        break;
      }
    }
  }

  return issues;
}

// ── localStorage ──────────────────────────────────────────────────────────────

const VALIDATION_KEY_PREFIX = "fusus-camera-validation-";

function validationStorageKey(taskId: string): string {
  return `${VALIDATION_KEY_PREFIX}${taskId}`;
}

export function readValidationResultFromStorage(
  taskId: string,
): CameraValidationResult | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(validationStorageKey(taskId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CameraValidationResult;
  } catch {
    return null;
  }
}

export function writeValidationResultToStorage(
  taskId: string,
  result: CameraValidationResult,
): void {
  window.localStorage.setItem(
    validationStorageKey(taskId),
    JSON.stringify(result),
  );
}

export function clearValidationResultFromStorage(taskId: string): void {
  window.localStorage.removeItem(validationStorageKey(taskId));
}

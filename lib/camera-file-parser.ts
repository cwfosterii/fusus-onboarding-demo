/**
 * Parses uploaded camera spreadsheet files (CSV and Excel) into CameraRow[].
 *
 * Uses the xlsx (SheetJS) library to handle both formats uniformly.
 * Column headers are matched to schema keys case-insensitively via the
 * templateHeader defined in camera-schema.ts, so minor customer formatting
 * variations are tolerated.
 */

import * as XLSX from "xlsx";
import {
  CAMERA_FIELD_SCHEMA,
  defaultCameraRow,
  type CameraRow,
} from "@/lib/camera-schema";

export type FileParseResult = {
  rows: CameraRow[];
  /** Human-readable parse errors (empty = success) */
  parseErrors: string[];
  /** Actual headers found in the file */
  detectedHeaders: string[];
  /** Schema headers that had no matching column */
  unmappedHeaders: string[];
};

// ── Header mapping ─────────────────────────────────────────────────────────────

/** Map from templateHeader (lower-cased) → schema key */
const HEADER_TO_KEY = new Map<string, string>(
  CAMERA_FIELD_SCHEMA.map((f) => [f.templateHeader.toLowerCase().trim(), f.key]),
);

/** Also accept underscore/hyphen variants and common aliases */
const HEADER_ALIASES = new Map<string, string>([
  ["camera_name", "cameraName"],
  ["camera name", "cameraName"],
  ["ip_address", "ipAddress"],
  ["ip address", "ipAddress"],
  ["ipaddress", "ipAddress"],
  ["lat/lon", "latLon"],
  ["lat_lon", "latLon"],
  ["lat lon", "latLon"],
  ["latitude/longitude", "latLon"],
  ["lat,lon", "latLon"],
]);

function headerToKey(raw: string): string | undefined {
  const normalized = raw.toLowerCase().trim();
  return HEADER_TO_KEY.get(normalized) ?? HEADER_ALIASES.get(normalized);
}

// ── Cell coercion ─────────────────────────────────────────────────────────────

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).trim();
}

// ── Main parser ───────────────────────────────────────────────────────────────

export async function parseCameraFile(
  file: File,
): Promise<FileParseResult> {
  const parseErrors: string[] = [];

  // Read file as ArrayBuffer
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return {
      rows: [],
      parseErrors: ["Could not read the file. Please try again."],
      detectedHeaders: [],
      unmappedHeaders: [],
    };
  }

  // Parse with xlsx
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellText: false, cellDates: true });
  } catch {
    return {
      rows: [],
      parseErrors: [
        "The file could not be opened. Make sure it is a valid CSV or Excel file.",
      ],
      detectedHeaders: [],
      unmappedHeaders: [],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      parseErrors: ["The file has no sheets. Please use the provided template."],
      detectedHeaders: [],
      unmappedHeaders: [],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  // Get raw rows as arrays (header: 1 = first row is not treated as key row)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rawRows.length === 0) {
    return {
      rows: [],
      parseErrors: ["The file appears to be empty."],
      detectedHeaders: [],
      unmappedHeaders: [],
    };
  }

  // First row is the header
  const headerRow = (rawRows[0] as unknown[]).map((h) => cellToString(h));
  const detectedHeaders = headerRow.filter(Boolean);

  if (detectedHeaders.length === 0) {
    return {
      rows: [],
      parseErrors: ["No column headers found. Make sure the first row contains the column names."],
      detectedHeaders: [],
      unmappedHeaders: [],
    };
  }

  // Map each column position → schema key (undefined = unknown column)
  const colKeyMap: (string | undefined)[] = headerRow.map((h) =>
    h ? headerToKey(h) : undefined,
  );

  // Track which schema headers had no match
  const mappedKeys = new Set(colKeyMap.filter(Boolean));
  const unmappedHeaders = CAMERA_FIELD_SCHEMA.filter(
    (f) => !mappedKeys.has(f.key),
  ).map((f) => f.templateHeader);

  if (unmappedHeaders.length === CAMERA_FIELD_SCHEMA.length) {
    parseErrors.push(
      "None of the column headers matched the expected template. Please use the provided template as a starting point.",
    );
  } else if (unmappedHeaders.length > 0) {
    parseErrors.push(
      `Some columns were not recognized and will be skipped: ${unmappedHeaders.join(", ")}.`,
    );
  }

  // Parse data rows
  const dataRows = rawRows.slice(1);
  const rows: CameraRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i] as unknown[];
    // Skip entirely blank rows
    const hasAnyValue = rawRow.some((v) => cellToString(v) !== "");
    if (!hasAnyValue) continue;

    const cameraRow = defaultCameraRow();
    colKeyMap.forEach((key, colIdx) => {
      if (!key) return;
      cameraRow[key] = cellToString(rawRow[colIdx]);
    });
    rows.push(cameraRow);
  }

  if (rows.length === 0) {
    parseErrors.push(
      "No data rows found. Make sure the file has at least one camera entry below the header row.",
    );
  }

  return { rows, parseErrors, detectedHeaders, unmappedHeaders };
}

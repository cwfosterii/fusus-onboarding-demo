/**
 * POST /api/v1/validate/camera-upload
 *
 * Accepts parsed camera rows and performs AI-assisted soft review.
 * Hard validation (IP, lat/lon, duplicates, etc.) runs client-side before
 * this endpoint is called — this endpoint only adds warnings, never hard errors.
 *
 * Uses the Vercel AI Gateway with generateText + Output.object() for structured output.
 * Gracefully falls back to empty issues if the gateway is unavailable or misconfigured.
 */

import { generateText, Output } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { CAMERA_FIELD_SCHEMA } from "@/lib/camera-schema";
import type { ValidationIssue } from "@/lib/camera-validation";

// ── Request / response shape ──────────────────────────────────────────────────

type RequestBody = {
  rows: Record<string, string>[];
  fileName?: string;
};

// ── AI output schema ──────────────────────────────────────────────────────────

const aiReviewSchema = z.object({
  rowReviews: z.array(
    z.object({
      /** 1-based row number matching the uploaded file */
      rowNumber: z.number(),
      issues: z.array(
        z.object({
          field: z.string().optional(),
          message: z.string(),
          suggestedFix: z.string().optional(),
        }),
      ),
    }),
  ),
  /** Short narrative for the customer (1-2 sentences max) */
  overallInsights: z.string(),
});

// ── CSV builder (for AI prompt) ───────────────────────────────────────────────

function rowsToCsvSnippet(rows: Record<string, string>[]): string {
  const headers = CAMERA_FIELD_SCHEMA.map((f) => f.templateHeader);
  const lines = [
    headers.join(","),
    ...rows.map((row, i) => {
      const cells = CAMERA_FIELD_SCHEMA.map((f) => {
        const v = (row[f.key] ?? "").replace(/,/g, " ").replace(/\n/g, " ");
        return v;
      });
      return `${i + 1},${cells.join(",")}`;
    }),
  ];
  return lines.join("\n");
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { rows, fileName } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ aiIssues: [], overallInsights: "" });
  }

  const csvSnippet = rowsToCsvSnippet(rows);
  const fileLabel = fileName ? ` from file "${fileName}"` : "";

  const prompt = `You are a data quality reviewer for a law enforcement agency's security camera deployment.
Review the following ${rows.length} camera records${fileLabel} and identify soft data quality issues.

Column order in CSV: Row#, Camera Name, Make, Model, Location, Floor, Type, Disposition, IP Address, Username, Password, Lat_Lon, AI

Focus only on:
1. Near-duplicate cameras: same or very similar location + name that likely represent the same physical camera entered twice
2. Vague location names that could cause confusion during installation (e.g. just "intersection", "outside", "area")
3. Suspicious placeholder data: names or values that look like test entries from copied rows (e.g. "Camera 1", "Camera 2", "Camera 3" as sequential placeholders)
4. Coordinates that appear geographically inconsistent with each other (e.g. one camera in a different state)
5. Generic camera naming that suggests bulk-copied rows needing individualisation

Rules:
- Only flag real, specific issues. Do not invent problems.
- AI can ONLY add "warning" level issues — never block the upload.
- Keep messages short (under 120 characters) and customer-friendly. Avoid technical jargon.
- If the data looks clean and reasonable, return empty rowReviews and a short positive insight.
- overallInsights should be 1-2 sentences summarising the data quality at a glance.

Camera data:
${csvSnippet}`;

  try {
    const result = await generateText({
      model: gateway("openai/gpt-4.1-mini"),
      output: Output.object({ schema: aiReviewSchema }),
      prompt,
    });

    const review = result.output;
    if (!review) {
      return Response.json({ aiIssues: [], overallInsights: "" });
    }

    // Convert AI review → ValidationIssue[]
    const aiIssues: ValidationIssue[] = review.rowReviews.flatMap((rr) =>
      rr.issues.map((issue) => ({
        rowNumber: rr.rowNumber,
        field: issue.field,
        severity: "warning" as const,
        code: "ai_review",
        message: issue.message,
        suggestedFix: issue.suggestedFix,
      })),
    );

    return Response.json({
      aiIssues,
      overallInsights: review.overallInsights,
    });
  } catch (err) {
    // Graceful fallback — AI unavailable does not block validation
    console.error("[camera-upload validation] AI review failed:", err);
    return Response.json({
      aiIssues: [],
      overallInsights: "",
      fallback: true,
    });
  }
}

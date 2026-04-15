/**
 * Data-driven task workflow — order, copy, media, and future API paths.
 * Add tasks here without changing page logic.
 */

export type TaskStatus = "not-started" | "in-progress" | "complete";

export type TaskKind =
  | "video-guidance"
  | "form"
  | "video-and-form";

export type FormFieldType = "text" | "email" | "tel" | "textarea" | "file";

export type TaskFormField = {
  /** Stable key for JSON body / future API */
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  /** Hint for template uploads */
  accept?: string;
};

export type WorkflowAgency = {
  name: string;
};

export type WorkflowPso = {
  name: string;
  title: string;
  email: string;
};

/**
 * Top-level deployment context (agency + Axon POC).
 * Replace with API-driven data in production; do not hardcode in UI.
 */
export const workflow = {
  agency: {
    name: "Metro City Police Department",
  },
  pso: {
    name: "Jordan Smith",
    title: "Senior Customer Success Manager — Axon",
    email: "jordan.smith@axon.com",
  },
} as const satisfies { agency: WorkflowAgency; pso: WorkflowPso };

/** Two-letter initials from a display name (first + last word, or first two chars). */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    if (w.length >= 2) return w.slice(0, 2).toUpperCase();
    return `${w[0] ?? "?"}`.toUpperCase();
  }
  const a = parts[0][0] ?? "";
  const b = parts[parts.length - 1][0] ?? "";
  return `${a}${b}`.toUpperCase();
}

export type WorkflowTask = {
  id: string;
  kind: TaskKind;
  title: string;
  /** Short line under the title */
  intro: string;
  /** Group label for progress UI */
  group: string;
  /** HeyGen / YouTube / MP4 embed — null for form-only tasks */
  videoEmbedUrl: string | null;
  videoTitle: string;
  /** Seconds before unlock (iframe cannot always fire onEnded) */
  videoUnlockAfterSeconds: number;
  /** Shown below the video / above Next */
  whatNext: string;
  /** Optional explicit lines for progressive “What to do next” (splits `whatNext` if omitted). */
  guidanceSteps?: string[];
  form?: {
    fields: TaskFormField[];
    /** Future POST path (mocked in app/api for now) */
    submitEndpoint: string;
    /**
     * When true, task page shows manual vs spreadsheet template flow
     * (readiness-style tasks; Phase 1 UI only).
     */
    dualInputModes?: boolean;
  };
  nextTaskId: string | null;
};

const HEYGEN_WELCOME =
  "https://app.heygen.com/embeds/810503c405734646b776281f3a81cc57";

/** Placeholder embeds — swap URLs in production without code changes */
const PLACEHOLDER_VIDEO =
  "https://app.heygen.com/embeds/810503c405734646b776281f3a81cc57";

export const TASKS: WorkflowTask[] = [
  {
    id: "welcome",
    kind: "video-guidance",
    title: "Welcome",
    intro: "Start here with a short overview of the deployment process.",
    group: "Welcome",
    videoEmbedUrl: HEYGEN_WELCOME,
    videoTitle: "Fusus Welcome Video",
    videoUnlockAfterSeconds: 45,
    whatNext:
      "When you’re ready, continue to set up roles and permissions for your agency.",
    nextTaskId: "agency-setup-roles",
  },
  {
    id: "agency-setup-roles",
    kind: "video-guidance",
    title: "Roles & permissions",
    intro: "Learn how to structure roles before creating users.",
    group: "Agency setup",
    videoEmbedUrl: PLACEHOLDER_VIDEO,
    videoTitle: "Roles and permissions overview",
    videoUnlockAfterSeconds: 45,
    whatNext: "Next, you’ll add users that match those roles.",
    nextTaskId: "agency-setup-users",
  },
  {
    id: "agency-setup-users",
    kind: "video-guidance",
    title: "Create users",
    intro: "Walk through creating agency and technical users.",
    group: "Agency setup",
    videoEmbedUrl: PLACEHOLDER_VIDEO,
    videoTitle: "Creating users",
    videoUnlockAfterSeconds: 45,
    whatNext: "Then you’ll record primary points of contact for the project.",
    nextTaskId: "agency-setup-pocs",
  },
  {
    id: "agency-setup-pocs",
    kind: "form",
    title: "Agency points of contact",
    intro: "Tell us who we should reach for day-to-day questions and approvals.",
    group: "Agency setup",
    videoEmbedUrl: null,
    videoTitle: "",
    videoUnlockAfterSeconds: 0,
    whatNext:
      "Submit the form to continue. You can update contacts later with your PSO.",
    form: {
      submitEndpoint: "/api/v1/agency/points-of-contact",
      /** Rendered by `AgencyPointsOfContactForm` — nested body for POST. */
      fields: [],
    },
    nextTaskId: "camera-readiness-overview",
  },
  {
    id: "camera-readiness-overview",
    kind: "video-guidance",
    title: "Camera readiness overview",
    intro: "How we validate cameras and RTSP details in your environment.",
    group: "Camera readiness",
    videoEmbedUrl: PLACEHOLDER_VIDEO,
    videoTitle: "Camera readiness",
    videoUnlockAfterSeconds: 45,
    whatNext: "Next you’ll complete your camera documentation.",
    nextTaskId: "camera-readiness-assets",
  },
  {
    id: "camera-readiness-assets",
    kind: "form",
    title: "Camera Documentation",
    intro:
      "Provide camera counts and notes, or use the spreadsheet template for bulk camera data.",
    group: "Camera readiness",
    videoEmbedUrl: null,
    videoTitle: "",
    videoUnlockAfterSeconds: 0,
    whatNext:
      "After submitting, you’ll review IT and network expectations, then document firewall and connectivity details.",
    form: {
      submitEndpoint: "/api/v1/cameras/asset-intake",
      dualInputModes: true,
      fields: [
        {
          name: "estimatedCameraCount",
          label: "Estimated number of cameras",
          type: "text",
          required: true,
          placeholder: "e.g. 42",
        },
        {
          name: "cameraListFile",
          label: "Supporting camera file (CSV or Excel, optional)",
          type: "file",
          required: false,
          accept: ".csv,.xlsx,.xls",
        },
        {
          name: "rtspNotes",
          label: "RTSP / credential notes",
          type: "textarea",
          required: false,
        },
      ],
    },
    nextTaskId: "technical-readiness-overview",
  },
  {
    id: "technical-readiness-overview",
    kind: "video-guidance",
    title: "Technical readiness overview",
    intro: "Understand IT and network expectations before go-live.",
    group: "Technical readiness",
    videoEmbedUrl: PLACEHOLDER_VIDEO,
    videoTitle: "Technical readiness",
    videoUnlockAfterSeconds: 45,
    whatNext:
      "Next you’ll document network details we need for integration.",
    nextTaskId: "technical-readiness-network",
  },
  {
    id: "technical-readiness-network",
    kind: "form",
    title: "Network & firewall details",
    intro:
      "Capture trusted sites, IP context, and optional diagram for your environment.",
    group: "Technical readiness",
    videoEmbedUrl: null,
    videoTitle: "",
    videoUnlockAfterSeconds: 0,
    whatNext:
      "You’re done with guided tasks — schedule your onsite session from the dashboard.",
    form: {
      submitEndpoint: "/api/v1/technical/network-profile",
      dualInputModes: true,
      fields: [
        {
          name: "trustedDomains",
          label: "Trusted domains / URLs (one per line)",
          type: "textarea",
          required: true,
          placeholder: "e.g. *.fusus.com\nhttps://…",
        },
        {
          name: "publicIpRange",
          label: "Public IP range or NAT notes",
          type: "text",
          required: false,
        },
        {
          name: "firewallNotes",
          label: "Firewall / change-window notes",
          type: "textarea",
          required: false,
        },
        {
          name: "networkDiagram",
          label: "Network diagram (optional)",
          type: "file",
          required: false,
          accept: ".pdf,.png,.jpg,.jpeg",
        },
      ],
    },
    nextTaskId: null,
  },
];

export const TASKS_ORDERED = TASKS;

export function getTaskById(id: string): WorkflowTask | undefined {
  return TASKS.find((t) => t.id === id);
}

export function getTaskIndex(id: string): number {
  return TASKS.findIndex((t) => t.id === id);
}

export function getNextTaskId(currentId: string): string | null {
  return getTaskById(currentId)?.nextTaskId ?? null;
}

export function getPreviousTaskId(currentId: string): string | null {
  const idx = getTaskIndex(currentId);
  if (idx <= 0) return null;
  return ALL_TASK_IDS[idx - 1] ?? null;
}

export const TOTAL_TASKS = TASKS.length;

export const ALL_TASK_IDS = TASKS.map((t) => t.id);

/** Sequential guidance lines for the task page (one at a time in UI). */
export function getGuidanceSteps(task: WorkflowTask): string[] {
  if (task.guidanceSteps?.length) {
    return task.guidanceSteps.map((s) => s.trim()).filter(Boolean);
  }
  const t = task.whatNext.trim();
  if (!t) return [];
  const chunks = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks.length ? chunks : [t];
}

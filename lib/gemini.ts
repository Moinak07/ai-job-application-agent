/**
 * Server-only Gemini integration for resume parsing.
 *
 * SECURITY: this module reads `process.env.GEMINI_API_KEY` and must only be
 * imported from server code (server actions, server components). It is never
 * imported by a client component and the key is never exposed as
 * `NEXT_PUBLIC_*`.
 */

import {
  GoogleGenAI,
  Type,
  type ContentListUnion,
  type Schema,
} from "@google/genai";
import mammoth from "mammoth";
import { ALLOWED_RESUME_EXTENSIONS } from "@/lib/resumes";
import { normalizeProfile, type ProfileFormValues } from "@/lib/profile";

/** Thrown when `GEMINI_API_KEY` is missing — parsing is unavailable but not broken. */
export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured");
    this.name = "GeminiNotConfiguredError";
  }
}

/** Default model; override with the optional `GEMINI_MODEL` env var. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

const EXTRACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  description:
    "Structured personal and professional details extracted from a resume document.",
  properties: {
    full_name: { type: Type.STRING, description: "The person's full name." },
    headline: {
      type: Type.STRING,
      description:
        "Professional headline or current title, e.g. 'Senior Frontend Engineer'.",
    },
    location: { type: Type.STRING, description: "City, region, and/or country." },
    phone: { type: Type.STRING, description: "Phone number if printed on the resume." },
    email: { type: Type.STRING, description: "Email address if printed on the resume." },
    professional_summary: {
      type: Type.STRING,
      description: "The professional summary / about section, lightly cleaned up.",
    },
    other_details: {
      type: Type.STRING,
      description:
        "Notable extra information that does not fit other fields (awards, languages, interests, achievements), as one short paragraph or bullet list.",
    },
    skills: {
      type: Type.ARRAY,
      description: "Distinct professional skills, tools, and technologies.",
      items: { type: Type.STRING },
    },
    work_experience: {
      type: Type.ARRAY,
      description: "Work history entries, most recent first.",
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          job_title: { type: Type.STRING },
          start_date: { type: Type.STRING, description: "Start date or year as printed." },
          end_date: {
            type: Type.STRING,
            description: "End date/year, or 'Present' if the role is current.",
          },
          duration: {
            type: Type.STRING,
            description: "Total duration of the role as printed or computed.",
          },
          responsibilities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Key responsibilities and achievements.",
          },
        },
      },
    },
    education: {
      type: Type.ARRAY,
      description: "Education entries.",
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          field: { type: Type.STRING, description: "Field of study / major." },
          start_year: { type: Type.STRING },
          end_year: { type: Type.STRING },
          details: {
            type: Type.STRING,
            description: "GPA, honors, relevant coursework, or other notes.",
          },
        },
      },
    },
    projects: {
      type: Type.ARRAY,
      description: "Personal, academic, or professional projects.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          tech_stack: { type: Type.ARRAY, items: { type: Type.STRING } },
          link: { type: Type.STRING, description: "Project URL if printed." },
        },
      },
    },
    certifications: {
      type: Type.ARRAY,
      description: "Certifications and licenses.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          date: { type: Type.STRING },
          link: { type: Type.STRING },
        },
      },
    },
    links: {
      type: Type.ARRAY,
      description: "Personal links printed on the resume (portfolio, GitHub, LinkedIn…).",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "e.g. 'GitHub', 'Portfolio'." },
          url: { type: Type.STRING },
        },
      },
    },
  },
};

const PROMPT = `You are a precise resume-parsing assistant. Extract the person's details from the attached resume into the requested JSON structure.

Rules:
- Use exactly the fields provided; do not invent sections.
- Copy facts from the resume only — never guess or embellish.
- Dates and durations: keep them as printed on the resume.
- Leave a field empty ("" or []) when the resume does not mention it.
- Responsibilities are short bullets, one array item per bullet, cleaned of bullet markers.
- links: only URLs actually printed on the resume.`;

type ResumeKind = "pdf" | "docx" | "txt";

function resumeKindFromPath(path: string): ResumeKind | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

async function buildContents(
  kind: ResumeKind,
  bytes: Uint8Array
): Promise<ContentListUnion> {
  if (kind === "pdf") {
    // Gemini ingests PDFs natively via base64 inline data. A 5 MB resume is
    // ~6.7 MB base64, well under the inline-data limit.
    return [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: Buffer.from(bytes).toString("base64"),
        },
      },
    ];
  }

  let text: string;
  if (kind === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = value;
  } else {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  return [{ text }];
}

/**
 * Result of a successful extraction: normalized profile values, the email as
 * printed on the resume (kept in the extraction record, never written to
 * `profiles.email`), and the model that produced it.
 */
export type ResumeExtraction = {
  profile: ProfileFormValues;
  email: string;
  model: string;
};

/**
 * Extracts structured profile data from raw resume bytes.
 *
 * Routing is by file extension (the upload allowlist already guarantees
 * .pdf/.docx/.txt), never by the client-supplied mime type.
 *
 * Throws `GeminiNotConfiguredError` when the API key is missing and other
 * errors (network, quota, malformed output, unsupported extension) are
 * surfaced to the caller — server actions map them to user-safe messages.
 */
export async function extractResumeFromBytes(
  storagePath: string,
  bytes: Uint8Array
): Promise<ResumeExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiNotConfiguredError();
  }

  const kind = resumeKindFromPath(storagePath);
  if (!kind) {
    throw new Error(
      `Unsupported resume file type: ${ALLOWED_RESUME_EXTENSIONS.join(", ")} files only`
    );
  }

  const model = getGeminiModel();
  const ai = new GoogleGenAI({ apiKey });
  const contents = await buildContents(kind, bytes);

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
      systemInstruction: PROMPT,
      temperature: 0,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned malformed JSON");
  }

  // Defensive normalization: trim, coerce, cap, and drop anything unexpected.
  const profile = normalizeProfile(parsed);
  const record = (parsed ?? {}) as Record<string, unknown>;

  return {
    profile,
    email: typeof record.email === "string" ? record.email.trim().slice(0, 500) : "",
    model,
  };
}

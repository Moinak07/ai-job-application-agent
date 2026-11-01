"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  RESUME_BUCKET_NAME,
  RESUMES_TABLE_NAME,
} from "@/lib/resumes";
import {
  GeminiNotConfiguredError,
  extractResumeFromBytes,
  getGeminiModel,
} from "@/lib/gemini";
import {
  emptyProfile,
  mergeProfile,
  normalizeProfile,
  profileToRow,
} from "@/lib/profile";

const RESUME_EXTRACTIONS_TABLE_NAME = "resume_extractions";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_SIGNED_IN = "You must be signed in to do that.";
const NOT_CONFIGURED =
  "Resume parsing is not configured. Add GEMINI_API_KEY to .env.local, restart the dev server, and try again.";
const NOT_MIGRATED =
  "The database needs the latest schema. Run the SQL from supabase/schema.sql in Supabase, then try again.";
const PARSE_FAILED =
  "We couldn't analyze that resume. Please wait a moment and try again.";
const RESUME_MISSING = "That resume no longer exists.";
const DOWNLOAD_FAILED = "Could not download the resume file. Please try again.";

/**
 * True for Postgres errors raised when a table or a column the feature needs
 * is missing — i.e. the user has not run the updated schema.sql yet.
 */
function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === "42P01" ||
    code === "42703" ||
    (typeof message === "string" && message.includes("does not exist"))
  );
}

function toUserSafeMessage(error: unknown): string {
  if (error instanceof GeminiNotConfiguredError) {
    return NOT_CONFIGURED;
  }
  if (isMissingSchemaError(error)) {
    return NOT_MIGRATED;
  }
  return PARSE_FAILED;
}

async function recordFailedExtraction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  resumeId: string,
  message: string,
  rawError: unknown
): Promise<string> {
  // The user-safe message is what surfaces on the Resume page; the raw
  // error text stays out of the database and out of the UI.
  let model: string | null = null;
  try {
    model = getGeminiModel();
  } catch {
    model = null;
  }

  const { error } = await supabase
    .from(RESUME_EXTRACTIONS_TABLE_NAME)
    .upsert(
      {
        user_id: userId,
        resume_id: resumeId,
        status: "failed",
        error: message,
        extracted_data: null,
        model,
      },
      { onConflict: "resume_id" }
    );

  if (error) {
    // Recording the failure is best-effort; the original message still
    // reaches the user unless the schema itself is missing.
    return isMissingSchemaError(error) || isMissingSchemaError(rawError)
      ? NOT_MIGRATED
      : message;
  }
  return message;
}

/**
 * Parses a resume with Gemini and merges the extracted values into the
 * user's profile. Safe to call repeatedly (re-parse upserts the extraction
 * record and only overwrites profile sections with non-empty values).
 */
export async function parseResume(resumeId: string): Promise<ActionResult> {
  if (!resumeId) {
    return { ok: false, error: RESUME_MISSING };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: NOT_SIGNED_IN };
  }

  // RLS scopes this to the signed-in user, so a missing row means the
  // resume is gone (or was never theirs).
  const { data: resume, error: resumeError } = await supabase
    .from(RESUMES_TABLE_NAME)
    .select("id, storage_path")
    .eq("id", resumeId)
    .maybeSingle();

  if (resumeError) {
    return {
      ok: false,
      error: isMissingSchemaError(resumeError) ? NOT_MIGRATED : PARSE_FAILED,
    };
  }
  if (!resume?.storage_path) {
    return { ok: false, error: RESUME_MISSING };
  }

  let extraction: Awaited<ReturnType<typeof extractResumeFromBytes>>;
  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(RESUME_BUCKET_NAME)
      .download(resume.storage_path);

    if (downloadError || !blob) {
      const message = await recordFailedExtraction(
        supabase,
        user.id,
        resumeId,
        DOWNLOAD_FAILED,
        downloadError
      );
      return { ok: false, error: message };
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    extraction = await extractResumeFromBytes(resume.storage_path, bytes);
  } catch (error) {
    const message = await recordFailedExtraction(
      supabase,
      user.id,
      resumeId,
      toUserSafeMessage(error),
      error
    );
    return { ok: false, error: message };
  }

  // Merge into whatever the profile already holds (missing row = empty
  // defaults). Only non-empty extracted values overwrite existing data.
  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    const message = await recordFailedExtraction(
      supabase,
      user.id,
      resumeId,
      NOT_MIGRATED,
      profileError
    );
    return { ok: false, error: message };
  }

  const merged = mergeProfile(
    currentProfile ? normalizeProfile(currentProfile) : emptyProfile(),
    extraction.profile
  );

  // `email`/`avatar_url` are never written by parsing: profileToRow omits
  // them, so this upsert touches only parse-managed columns.
  const { error: saveError } = await supabase.from("profiles").upsert({
    id: user.id,
    ...profileToRow(merged),
  });

  if (saveError) {
    const message = await recordFailedExtraction(
      supabase,
      user.id,
      resumeId,
      NOT_MIGRATED,
      saveError
    );
    return { ok: false, error: message };
  }

  const { error: extractionError } = await supabase
    .from(RESUME_EXTRACTIONS_TABLE_NAME)
    .upsert(
      {
        user_id: user.id,
        resume_id: resumeId,
        status: "succeeded",
        error: null,
        // The normalized extraction (plus the email as printed on the
        // resume), kept for inspection and future re-processing.
        extracted_data: {
          ...profileToRow(extraction.profile),
          email: extraction.email,
        },
        model: extraction.model,
      },
      { onConflict: "resume_id" }
    );

  if (extractionError) {
    return {
      ok: false,
      error: isMissingSchemaError(extractionError) ? NOT_MIGRATED : PARSE_FAILED,
    };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/resume");
  return { ok: true };
}

/**
 * Deletes one of the user's resumes: the row (its extraction record cascades),
 * then the storage object (best-effort). Profile data is never cleared.
 */
export async function deleteResume(resumeId: string): Promise<ActionResult> {
  if (!resumeId) {
    return { ok: false, error: RESUME_MISSING };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: NOT_SIGNED_IN };
  }

  const { data: resume, error: selectError } = await supabase
    .from(RESUMES_TABLE_NAME)
    .select("id, storage_path")
    .eq("id", resumeId)
    .maybeSingle();

  if (selectError) {
    return {
      ok: false,
      error: isMissingSchemaError(selectError) ? NOT_MIGRATED : PARSE_FAILED,
    };
  }
  if (!resume) {
    return { ok: false, error: RESUME_MISSING };
  }

  const { error: deleteError } = await supabase
    .from(RESUMES_TABLE_NAME)
    .delete()
    .eq("id", resumeId);

  if (deleteError) {
    return { ok: false, error: "Could not delete that resume. Please try again." };
  }

  // The row is gone; the orphaned object is cleaned up best-effort so a
  // storage hiccup can never block the delete.
  await supabase.storage
    .from(RESUME_BUCKET_NAME)
    .remove([resume.storage_path])
    .catch(() => undefined);

  revalidatePath("/dashboard/resume");
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

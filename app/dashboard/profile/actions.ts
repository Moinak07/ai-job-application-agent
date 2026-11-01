"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeProfile,
  profileToRow,
  validateProfile,
  type ProfileFieldError,
  type ProfileFormValues,
} from "@/lib/profile";

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors: ProfileFieldError[] };

const NOT_SIGNED_IN = "You must be signed in to do that.";
const NOT_MIGRATED =
  "The database needs the latest schema. Run the SQL from supabase/schema.sql in Supabase, then try again.";
const SAVE_FAILED = "Could not save your profile. Please try again.";

/** True when the profiles table is missing the parse-managed columns. */
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

/**
 * Saves the full editable profile. Validation runs first so the user gets
 * inline field errors; on success the values go through the same
 * normalization path the Gemini pipeline uses, then are upserted into the
 * user's `profiles` row.
 */
export async function saveProfile(values: ProfileFormValues): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: NOT_SIGNED_IN, fieldErrors: [] };
  }

  const fieldErrors = validateProfile(values);
  if (fieldErrors.length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  // Trim, cap, and drop empty items exactly like the parse pipeline, so
  // user edits and AI extractions produce identical shapes.
  const normalized = normalizeProfile(values);

  // Upsert: creates the row for accounts whose signup trigger never ran
  // (email/avatar_url are absent from profileToRow and stay untouched).
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    ...profileToRow(normalized),
  });

  if (error) {
    return {
      ok: false,
      error: isMissingSchemaError(error) ? NOT_MIGRATED : SAVE_FAILED,
      fieldErrors: [],
    };
  }

  revalidatePath("/dashboard/profile");
  return { ok: true };
}

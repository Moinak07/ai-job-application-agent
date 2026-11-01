/**
 * Shared constraints and helpers for user-uploaded resumes.
 * Used by the onboarding dialog today and the Resume page upload later.
 */

export const RESUMES_TABLE_NAME = "resumes";

export const RESUME_BUCKET_NAME = "resumes";

/** 5 MB */
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export const RESUME_INPUT_ACCEPT = ALLOWED_RESUME_EXTENSIONS.join(",");

const SANITIZED_STEM_MAX_LENGTH = 80;
const SANITIZED_EXTENSION_MAX_LENGTH = 12;

export type ResumeFileValidation =
  | { valid: true }
  | { valid: false; reason: string };

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return fileName.slice(dotIndex).toLowerCase();
}

function isAllowedExtension(extension: string): boolean {
  return (ALLOWED_RESUME_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Makes a user-supplied filename safe to embed in a storage object path:
 * strips any directory component, replaces whitespace with hyphens, drops
 * everything outside [A-Za-z0-9._-], and caps the length while keeping the
 * extension.
 */
export function sanitizeFileName(fileName: string): string {
  const lastSegment = fileName.split(/[\\/]/).pop() ?? "";
  const dotIndex = lastSegment.lastIndexOf(".");
  const rawStem = dotIndex === -1 ? lastSegment : lastSegment.slice(0, dotIndex);
  const rawExtension = dotIndex === -1 ? "" : lastSegment.slice(dotIndex);

  const stem = rawStem
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, SANITIZED_STEM_MAX_LENGTH);

  const extension = rawExtension
    .replace(/[^A-Za-z0-9.]/g, "")
    .slice(0, SANITIZED_EXTENSION_MAX_LENGTH);

  return `${stem}${extension}` || "resume";
}

/**
 * Storage object path for a resume: `{userId}/{uuid}-{sanitized filename}`.
 * The `{userId}/` prefix is what the storage RLS policies scope on.
 */
export function buildResumeStoragePath(userId: string, fileName: string): string {
  if (!userId) {
    throw new Error("buildResumeStoragePath requires a user id");
  }
  return `${userId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

/**
 * Validates a selected resume file against the upload constraints.
 * Pure: performs no I/O so callers can reject bad files before any network call.
 */
export function validateResumeFile(file: {
  name: string;
  size: number;
}): ResumeFileValidation {
  const extension = getExtension(file.name);

  if (!isAllowedExtension(extension)) {
    return {
      valid: false,
      reason: `“${file.name}” is not a supported file type. Please upload a PDF, DOCX, or TXT file.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      reason: "That file appears to be empty. Please choose a valid resume file.",
    };
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return {
      valid: false,
      reason: "That file is too large. The maximum file size is 5 MB.",
    };
  }

  return { valid: true };
}

/** Formats a byte count as a human-readable size (B / KB / MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

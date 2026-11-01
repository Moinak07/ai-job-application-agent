/**
 * Shared types, defaults, and normalizers for parsed/editable profile data.
 *
 * This module is client-safe (no I/O, no secrets) and is the single
 * validation path for both:
 *  - Gemini extraction results (defensive: model output is never trusted raw)
 *  - User edits saved from the Profile page
 *
 * It works for both because a Supabase `profiles` row and a parsed Gemini
 * response have the same shape: scalar text columns/fields plus JSONB
 * arrays that need the same coercion rules.
 */

export type ProfileLink = {
  label: string;
  url: string;
};

export type WorkExperienceEntry = {
  company: string;
  job_title: string;
  start_date: string;
  end_date: string;
  /** Free-form duration as printed on the resume, e.g. "Jan 2020 - Mar 2022". */
  duration: string;
  responsibilities: string[];
};

export type EducationEntry = {
  institution: string;
  degree: string;
  field: string;
  start_year: string;
  end_year: string;
  details: string;
};

export type ProjectEntry = {
  name: string;
  description: string;
  tech_stack: string[];
  link: string;
};

export type CertificationEntry = {
  name: string;
  issuer: string;
  date: string;
  link: string;
};

export type ProfileFormValues = {
  full_name: string;
  headline: string;
  location: string;
  phone: string;
  professional_summary: string;
  additional_info: string;
  skills: string[];
  work_experience: WorkExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  links: ProfileLink[];
};

export type ProfileFieldError = {
  field: string;
  message: string;
};

const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 50;
const MAX_SKILLS = 100;
const MAX_NESTED_ITEMS = 50;

export function emptyLink(): ProfileLink {
  return { label: "", url: "" };
}

export function emptyWorkExperience(): WorkExperienceEntry {
  return {
    company: "",
    job_title: "",
    start_date: "",
    end_date: "",
    duration: "",
    responsibilities: [],
  };
}

export function emptyEducation(): EducationEntry {
  return {
    institution: "",
    degree: "",
    field: "",
    start_year: "",
    end_year: "",
    details: "",
  };
}

export function emptyProject(): ProjectEntry {
  return { name: "", description: "", tech_stack: [], link: "" };
}

export function emptyCertification(): CertificationEntry {
  return { name: "", issuer: "", date: "", link: "" };
}

export function emptyProfile(): ProfileFormValues {
  return {
    full_name: "",
    headline: "",
    location: "",
    phone: "",
    professional_summary: "",
    additional_info: "",
    skills: [],
    work_experience: [],
    education: [],
    projects: [],
    certifications: [],
    links: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function asLongString(value: unknown): string {
  return asString(value, MAX_LONG_TEXT_LENGTH);
}

function asStringArray(value: unknown, maxItems = MAX_ARRAY_ITEMS): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim().slice(0, MAX_TEXT_LENGTH);
    if (trimmed) {
      items.push(trimmed);
    }
    if (items.length >= maxItems) {
      break;
    }
  }
  return items;
}

function normalizeLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const links: ProfileLink[] = [];
  for (const item of value.slice(0, MAX_ARRAY_ITEMS)) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const url = asString(record.url);
    if (!isUrlish(url)) {
      continue;
    }
    links.push({ label: asString(record.label), url });
  }
  return links;
}

function normalizeWorkExperience(value: unknown): WorkExperienceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: WorkExperienceEntry[] = [];
  for (const item of value.slice(0, MAX_ARRAY_ITEMS)) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const entry: WorkExperienceEntry = {
      company: asString(record.company),
      job_title: asString(record.job_title),
      start_date: asString(record.start_date),
      end_date: asString(record.end_date),
      duration: asString(record.duration),
      responsibilities: asStringArray(record.responsibilities, MAX_NESTED_ITEMS),
    };
    if (entry.company || entry.job_title || entry.responsibilities.length > 0) {
      entries.push(entry);
    }
  }
  return entries;
}

function normalizeEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: EducationEntry[] = [];
  for (const item of value.slice(0, MAX_ARRAY_ITEMS)) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const entry: EducationEntry = {
      institution: asString(record.institution),
      degree: asString(record.degree),
      field: asString(record.field),
      start_year: asString(record.start_year),
      end_year: asString(record.end_year),
      details: asString(record.details),
    };
    if (entry.institution || entry.degree || entry.field) {
      entries.push(entry);
    }
  }
  return entries;
}

function normalizeProjects(value: unknown): ProjectEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: ProjectEntry[] = [];
  for (const item of value.slice(0, MAX_ARRAY_ITEMS)) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const entry: ProjectEntry = {
      name: asString(record.name),
      description: asLongString(record.description),
      tech_stack: asStringArray(record.tech_stack, MAX_NESTED_ITEMS),
      link: asString(record.link),
    };
    if (entry.name || entry.description) {
      entries.push(entry);
    }
  }
  return entries;
}

function normalizeCertifications(value: unknown): CertificationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: CertificationEntry[] = [];
  for (const item of value.slice(0, MAX_ARRAY_ITEMS)) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const entry: CertificationEntry = {
      name: asString(record.name),
      issuer: asString(record.issuer),
      date: asString(record.date),
      link: asString(record.link),
    };
    if (entry.name || entry.issuer) {
      entries.push(entry);
    }
  }
  return entries;
}

/**
 * Coerces unknown input (a Gemini JSON response or a `profiles` row)
 * into a fully-typed, trimmed, capped `ProfileFormValues`. Never throws:
 * anything it cannot interpret becomes an empty default.
 */
export function normalizeProfile(raw: unknown): ProfileFormValues {
  const record = asRecord(raw) ?? {};
  return {
    full_name: asString(record.full_name),
    headline: asString(record.headline),
    location: asString(record.location),
    phone: asString(record.phone),
    professional_summary: asLongString(record.professional_summary),
    additional_info: asLongString(record.additional_info ?? record.other_details),
    skills: asStringArray(record.skills, MAX_SKILLS),
    work_experience: normalizeWorkExperience(record.work_experience),
    education: normalizeEducation(record.education),
    projects: normalizeProjects(record.projects),
    certifications: normalizeCertifications(record.certifications),
    links: normalizeLinks(record.links),
  };
}

/**
 * Merge semantics for re-parsing: extracted values overwrite existing data
 * only when non-empty (non-blank strings, non-empty arrays). A sparse
 * re-parse never blanks out the user's edits. `email`/`avatar_url` are
 * never written by parsing and are not part of these values.
 */
export function mergeProfile(
  existing: ProfileFormValues,
  incoming: ProfileFormValues
): ProfileFormValues {
  return {
    full_name: incoming.full_name || existing.full_name,
    headline: incoming.headline || existing.headline,
    location: incoming.location || existing.location,
    phone: incoming.phone || existing.phone,
    professional_summary: incoming.professional_summary || existing.professional_summary,
    additional_info: incoming.additional_info || existing.additional_info,
    skills: incoming.skills.length > 0 ? incoming.skills : existing.skills,
    work_experience:
      incoming.work_experience.length > 0 ? incoming.work_experience : existing.work_experience,
    education: incoming.education.length > 0 ? incoming.education : existing.education,
    projects: incoming.projects.length > 0 ? incoming.projects : existing.projects,
    certifications:
      incoming.certifications.length > 0 ? incoming.certifications : existing.certifications,
    links: incoming.links.length > 0 ? incoming.links : existing.links,
  };
}

/** True when a URL looks usable: full http(s) URL or a bare domain[.domain]/path. */
export function isUrlish(url: string): boolean {
  const value = url.trim();
  if (!value || /\s/.test(value)) {
    return false;
  }
  if (/^https?:\/\/\S+$/i.test(value)) {
    return true;
  }
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value);
}

/**
 * Field-level checks for the Profile editor. Run before persisting so the
 * user gets inline errors instead of silent truncation/dropping. Length and
 * array caps are applied by `normalizeProfile`; this reports problems the
 * user should fix themselves.
 */
export function validateProfile(values: ProfileFormValues): ProfileFieldError[] {
  const errors: ProfileFieldError[] = [];

  values.links.forEach((link, index) => {
    if (!link.label.trim() && !link.url.trim()) {
      return; // fully empty rows are dropped by normalization
    }
    if (!isUrlish(link.url)) {
      errors.push({
        field: `links.${index}.url`,
        message: "Enter a valid URL (e.g. https://linkedin.com/in/you).",
      });
    }
  });

  values.projects.forEach((project, index) => {
    if (project.link.trim() && !isUrlish(project.link)) {
      errors.push({
        field: `projects.${index}.link`,
        message: "Enter a valid link or leave it empty.",
      });
    }
  });

  values.certifications.forEach((certification, index) => {
    if (certification.link.trim() && !isUrlish(certification.link)) {
      errors.push({
        field: `certifications.${index}.link`,
        message: "Enter a valid link or leave it empty.",
      });
    }
  });

  return errors;
}

/** True when every section is empty (used for the "upload a resume" hint card). */
export function profileIsEmpty(values: ProfileFormValues): boolean {
  return (
    !values.full_name &&
    !values.headline &&
    !values.location &&
    !values.phone &&
    !values.professional_summary &&
    !values.additional_info &&
    values.skills.length === 0 &&
    values.work_experience.length === 0 &&
    values.education.length === 0 &&
    values.projects.length === 0 &&
    values.certifications.length === 0 &&
    values.links.length === 0
  );
}

/**
 * The `profiles`-row shape written by both parseResume and saveProfile.
 * `email` and `avatar_url` are intentionally absent: parsing never touches
 * them and the editor does not expose them.
 */
export function profileToRow(values: ProfileFormValues) {
  return {
    full_name: values.full_name,
    headline: values.headline,
    location: values.location,
    phone: values.phone,
    professional_summary: values.professional_summary,
    additional_info: values.additional_info,
    skills: values.skills,
    work_experience: values.work_experience,
    education: values.education,
    projects: values.projects,
    certifications: values.certifications,
    links: values.links,
  };
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AlertCircleIcon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Edit02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { saveProfile } from "@/app/dashboard/profile/actions";
import {
  emptyCertification,
  emptyEducation,
  emptyLink,
  emptyProject,
  emptyWorkExperience,
  isUrlish,
  normalizeProfile,
  profileIsEmpty,
  type CertificationEntry,
  type EducationEntry,
  type ProfileFieldError,
  type ProfileFormValues,
  type ProjectEntry,
  type WorkExperienceEntry,
} from "@/lib/profile";
import {
  PROFILE_SECTIONS,
  ProfileCompletenessCard,
  type ProfileSectionKey,
  type SectionIcon,
} from "@/components/dashboard/profile/profile-completeness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";

const SECTION_ICON = Object.fromEntries(
  PROFILE_SECTIONS.map((section) => [section.id, section.icon])
) as Record<ProfileSectionKey, SectionIcon>;

/* Dark dashboard styling for the light-theme design tokens. */

const DARK_FIELD =
  "border-zinc-700/80! bg-zinc-950/70! text-zinc-100! placeholder:text-zinc-600! focus-visible:border-blue-500/50! focus-visible:ring-blue-500/20!";

const EDIT_BUTTON =
  "border! border-zinc-700/80! bg-zinc-800! text-zinc-200! hover:bg-zinc-700! hover:text-white!";

const SAVE_BUTTON =
  "bg-blue-600! text-white! hover:bg-blue-500! shadow-lg! shadow-blue-600/25!";

const CANCEL_BUTTON = "text-zinc-400! hover:bg-zinc-800! hover:text-zinc-100!";

const ADD_BUTTON =
  "border! border-zinc-700/80! bg-zinc-800/70! text-zinc-200! hover:bg-zinc-800! hover:text-white!";

const REMOVE_BUTTON = "text-red-400/90! hover:bg-red-500/10! hover:text-red-300!";

const CHIP =
  "border-zinc-700/70! bg-zinc-800/60! text-zinc-200! hover:border-blue-500/40! hover:text-white!";

function DarkInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return <Input className={cn(DARK_FIELD, className)} {...props} />;
}

function DarkTextarea({
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  return <Textarea className={cn(DARK_FIELD, className)} {...props} />;
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Tag editor (skills, tech stacks): removable chips plus an input that adds
 * on Enter or button click.
 */
function TagEditor({
  tags,
  placeholder,
  onChange,
}: {
  tags: string[];
  placeholder: string;
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const value = input.trim();
    if (!value || tags.includes(value)) {
      setInput("");
      return;
    }
    onChange([...tags, value]);
    setInput("");
  };

  return (
    <div className="space-y-2.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="secondary" className={CHIP}>
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                className="opacity-60 transition-opacity hover:opacity-100"
                onClick={() => onChange(tags.filter((_, i) => i !== index))}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  className="size-2.5"
                />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <DarkInput
          value={input}
          placeholder={placeholder}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" className={ADD_BUTTON} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  icon: SectionIcon;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900/50 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-900/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400 ring-1 ring-inset ring-blue-500/25">
            <HugeiconsIcon
              icon={icon}
              strokeWidth={1.75}
              className="size-4.5"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
              {title}
            </h3>
            <p className="truncate text-xs text-zinc-500">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={CANCEL_BUTTON}
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button size="sm" className={SAVE_BUTTON} onClick={onSave} disabled={isSaving}>
                {isSaving ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className={EDIT_BUTTON}
              onClick={onEdit}
            >
              <HugeiconsIcon
                icon={Edit02Icon}
                strokeWidth={2}
                className="size-3.5"
              />
              Edit
            </Button>
          )}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function EmptyHint({ children }: { children?: React.ReactNode }) {
  if (!children) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center">
        <p className="text-xs text-zinc-500">
          Nothing here yet. Click{" "}
          <span className="font-medium text-zinc-300">Edit</span> to add
          details.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function EntryTile({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      {children}
    </div>
  );
}

function DateChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-zinc-700/70 bg-zinc-800/60 px-2 py-0.5 text-[0.6875rem] text-zinc-400">
      {children}
    </span>
  );
}

export function ProfileView({
  profile,
  loadError,
}: {
  profile: ProfileFormValues;
  loadError?: string;
}) {
  const router = useRouter();
  const toastManager = useToastManager();

  const [values, setValues] = useState<ProfileFormValues>(profile);
  const [draft, setDraft] = useState<ProfileFormValues>(profile);
  const [activeTab, setActiveTab] = useState<ProfileSectionKey>("personal");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldError[]>([]);

  const startEdit = () => {
    setDraft(values);
    setFieldErrors([]);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(values);
    setFieldErrors([]);
    setEditing(false);
  };

  const handleTabChange = (tabId: string) => {
    const section = tabId as ProfileSectionKey;
    setActiveTab(section);
    // Leaving a tab mid-edit discards unsaved changes for that section.
    setDraft(values);
    setFieldErrors([]);
    setEditing(false);
  };

  /** From the completeness card: jump to a section and open its editor. */
  const handleSelectSection = (section: ProfileSectionKey) => {
    setActiveTab(section);
    setDraft(values);
    setFieldErrors([]);
    setEditing(true);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const result = await saveProfile(draft);
      if (result.ok) {
        // Mirror the server's normalization locally so the view matches
        // what was persisted.
        const normalized = normalizeProfile(draft);
        setValues(normalized);
        setEditing(false);
        setFieldErrors([]);
        toastManager.add({
          title: "Profile updated",
          type: "success",
        });
        router.refresh();
        return;
      }
      setFieldErrors(result.fieldErrors);
      if (result.fieldErrors.length === 0) {
        // Field-level validation errors render inline; only general
        // failures (auth, database) go to the toast.
        toastManager.add({ title: result.error, type: "error" });
      }
    } catch {
      toastManager.add({
        title: "Could not save your profile. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (patch: Partial<ProfileFormValues>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const errorFor = (field: string): ProfileFieldError | undefined =>
    fieldErrors.find((error) => error.field === field);

  const isEmpty = profileIsEmpty(values);
  // Live progress: while editing, the completeness card reflects the draft.
  const completenessValues = editing ? draft : values;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
          Profile
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Auto-filled from your resume and fully editable. Changes save
          directly to your account.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0"
          />
          <p>{loadError}</p>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col gap-4 rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-600/10 via-zinc-900/40 to-zinc-900/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-zinc-100">
              Your profile is empty
            </p>
            <p className="text-xs text-zinc-400">
              Upload a resume and we&lsquo;ll fill this in automatically — you
              can edit everything afterwards.
            </p>
          </div>
          <Button
            render={<Link href="/dashboard/resume" />}
            className="w-fit bg-blue-600! text-white! hover:bg-blue-500! shadow-lg! shadow-blue-600/25!"
          >
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            Upload a resume
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Main column: category tabs */}
        <div className="min-w-0 flex-1">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid! h-auto! w-full! grid-cols-2! gap-1.5! bg-transparent! p-0! sm:grid-cols-4!">
              {PROFILE_SECTIONS.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className={cn(
                    "h-auto! justify-center! gap-2! rounded-lg! border! border-zinc-700/70! bg-zinc-900/60! px-3! py-2.5! text-xs! text-zinc-400!",
                    "hover:bg-zinc-800! hover:text-zinc-100!",
                    "data-active:border-blue-500/50! data-active:bg-blue-600! data-active:text-white! data-active:shadow-lg! data-active:shadow-blue-600/25!"
                  )}
                >
                  <HugeiconsIcon
                    icon={section.icon}
                    strokeWidth={1.75}
                    className="size-3.5"
                  />
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 1. Personal details */}
            <TabsContent value="personal" className="mt-4">
              <SectionCard
                title="Personal details"
                description="Your name, current role, location, and links."
                icon={SECTION_ICON.personal}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="profile-full-name" className="text-zinc-300!">
                          Full name
                        </FieldLabel>
                        <DarkInput
                          id="profile-full-name"
                          value={draft.full_name}
                          onChange={(event) =>
                            updateDraft({ full_name: event.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="profile-headline" className="text-zinc-300!">
                          Headline
                        </FieldLabel>
                        <DarkInput
                          id="profile-headline"
                          placeholder="e.g. Senior Frontend Engineer"
                          value={draft.headline}
                          onChange={(event) =>
                            updateDraft({ headline: event.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="profile-location" className="text-zinc-300!">
                          Location
                        </FieldLabel>
                        <DarkInput
                          id="profile-location"
                          placeholder="City, Country"
                          value={draft.location}
                          onChange={(event) =>
                            updateDraft({ location: event.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="profile-phone" className="text-zinc-300!">
                          Phone
                        </FieldLabel>
                        <DarkInput
                          id="profile-phone"
                          value={draft.phone}
                          onChange={(event) =>
                            updateDraft({ phone: event.target.value })
                          }
                        />
                      </Field>
                    </div>

                    <div className="space-y-2.5">
                      <FieldLabel className="text-zinc-300!">Links</FieldLabel>
                      {draft.links.map((link, index) => (
                        <div key={index} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <DarkInput
                              className="w-32 sm:w-40"
                              placeholder="Label"
                              value={link.label}
                              onChange={(event) => {
                                const next = [...draft.links];
                                next[index] = {
                                  ...link,
                                  label: event.target.value,
                                };
                                updateDraft({ links: next });
                              }}
                            />
                            <DarkInput
                              placeholder="https://linkedin.com/in/you"
                              value={link.url}
                              onChange={(event) => {
                                const next = [...draft.links];
                                next[index] = {
                                  ...link,
                                  url: event.target.value,
                                };
                                updateDraft({ links: next });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className={REMOVE_BUTTON}
                              aria-label="Remove link"
                              onClick={() =>
                                updateDraft({
                                  links: draft.links.filter(
                                    (_, i) => i !== index
                                  ),
                                })
                              }
                            >
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                strokeWidth={2}
                                className="size-3.5"
                              />
                            </Button>
                          </div>
                          <FieldError
                            className="text-xs text-red-400"
                            errors={[errorFor(`links.${index}.url`)]}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={ADD_BUTTON}
                        onClick={() =>
                          updateDraft({
                            links: [...draft.links, emptyLink()],
                          })
                        }
                      >
                        <HugeiconsIcon
                          icon={Add01Icon}
                          strokeWidth={2}
                          className="size-3.5"
                        />
                        Add link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <EmptyHint>
                      {values.full_name ||
                      values.headline ||
                      values.location ||
                      values.phone ? (
                        <div className="space-y-1.5">
                          <p
                            className={cn(
                              "text-lg font-semibold tracking-tight",
                              values.full_name
                                ? "text-zinc-100"
                                : "text-zinc-500"
                            )}
                          >
                            {values.full_name || "Your name"}
                          </p>
                          {values.headline && (
                            <p className="text-sm font-medium text-blue-400">
                              {values.headline}
                            </p>
                          )}
                          {(values.location || values.phone) && (
                            <p className="text-xs text-zinc-400">
                              {[values.location, values.phone]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      ) : undefined}
                    </EmptyHint>
                    {values.links.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {values.links.map((link, index) => (
                          <Badge
                            key={`${link.url}-${index}`}
                            variant="outline"
                            className={CHIP}
                            render={
                              <a
                                href={withProtocol(link.url)}
                                target="_blank"
                                rel="noreferrer noopener"
                              />
                            }
                          >
                            {link.label || link.url}
                            <HugeiconsIcon
                              icon={ArrowUpRight01Icon}
                              strokeWidth={2}
                              className="size-2.5 opacity-60"
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* 2. Professional summary */}
            <TabsContent value="summary" className="mt-4">
              <SectionCard
                title="Professional summary"
                description="A short pitch at the top of your applications."
                icon={SECTION_ICON.summary}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <Field>
                    <FieldLabel htmlFor="profile-summary" className="text-zinc-300!">
                      Summary
                    </FieldLabel>
                    <DarkTextarea
                      id="profile-summary"
                      rows={5}
                      value={draft.professional_summary}
                      onChange={(event) =>
                        updateDraft({
                          professional_summary: event.target.value,
                        })
                      }
                    />
                  </Field>
                ) : (
                  <EmptyHint>
                    {values.professional_summary ? (
                      <p className="text-xs/relaxed whitespace-pre-line leading-relaxed text-zinc-300">
                        {values.professional_summary}
                      </p>
                    ) : undefined}
                  </EmptyHint>
                )}
              </SectionCard>
            </TabsContent>

            {/* 3. Skills */}
            <TabsContent value="skills" className="mt-4">
              <SectionCard
                title="Skills"
                description="Skills, tools, and technologies."
                icon={SECTION_ICON.skills}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <TagEditor
                    tags={draft.skills}
                    placeholder="e.g. React, and press Enter"
                    onChange={(skills) => updateDraft({ skills })}
                  />
                ) : values.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {values.skills.map((skill, index) => (
                      <Badge
                        key={`${skill}-${index}`}
                        variant="secondary"
                        className={CHIP}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyHint />
                )}
              </SectionCard>
            </TabsContent>

            {/* 4. Work experience */}
            <TabsContent value="experience" className="mt-4">
              <SectionCard
                title="Work experience"
                description="Your roles, most recent first."
                icon={SECTION_ICON.experience}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <div className="space-y-3">
                    {draft.work_experience.map((entry, index) => (
                      <WorkEntryEditor
                        key={index}
                        entry={entry}
                        onChange={(next) => {
                          const list = [...draft.work_experience];
                          list[index] = next;
                          updateDraft({ work_experience: list });
                        }}
                        onRemove={() =>
                          updateDraft({
                            work_experience: draft.work_experience.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                      />
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={ADD_BUTTON}
                      onClick={() =>
                        updateDraft({
                          work_experience: [
                            ...draft.work_experience,
                            emptyWorkExperience(),
                          ],
                        })
                      }
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                      Add role
                    </Button>
                  </div>
                ) : values.work_experience.length > 0 ? (
                  <div className="space-y-3">
                    {values.work_experience.map((entry, index) => (
                      <WorkEntryView
                        key={`${entry.company}-${index}`}
                        entry={entry}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyHint />
                )}
              </SectionCard>
            </TabsContent>

            {/* 5. Education */}
            <TabsContent value="education" className="mt-4">
              <SectionCard
                title="Education"
                description="Degrees, schools, and study details."
                icon={SECTION_ICON.education}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <div className="space-y-3">
                    {draft.education.map((entry, index) => (
                      <EducationEntryEditor
                        key={index}
                        entry={entry}
                        onChange={(next) => {
                          const list = [...draft.education];
                          list[index] = next;
                          updateDraft({ education: list });
                        }}
                        onRemove={() =>
                          updateDraft({
                            education: draft.education.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                      />
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={ADD_BUTTON}
                      onClick={() =>
                        updateDraft({
                          education: [...draft.education, emptyEducation()],
                        })
                      }
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                      Add education
                    </Button>
                  </div>
                ) : values.education.length > 0 ? (
                  <div className="space-y-3">
                    {values.education.map((entry, index) => (
                      <EducationEntryView
                        key={`${entry.institution}-${index}`}
                        entry={entry}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyHint />
                )}
              </SectionCard>
            </TabsContent>

            {/* 6. Projects */}
            <TabsContent value="projects" className="mt-4">
              <SectionCard
                title="Projects"
                description="Personal, academic, or professional work."
                icon={SECTION_ICON.projects}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <div className="space-y-3">
                    {draft.projects.map((entry, index) => (
                      <ProjectEntryEditor
                        key={index}
                        entry={entry}
                        linkError={errorFor(`projects.${index}.link`)?.message}
                        onChange={(next) => {
                          const list = [...draft.projects];
                          list[index] = next;
                          updateDraft({ projects: list });
                        }}
                        onRemove={() =>
                          updateDraft({
                            projects: draft.projects.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                      />
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={ADD_BUTTON}
                      onClick={() =>
                        updateDraft({
                          projects: [...draft.projects, emptyProject()],
                        })
                      }
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                      Add project
                    </Button>
                  </div>
                ) : values.projects.length > 0 ? (
                  <div className="space-y-3">
                    {values.projects.map((entry, index) => (
                      <ProjectEntryView
                        key={`${entry.name}-${index}`}
                        entry={entry}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyHint />
                )}
              </SectionCard>
            </TabsContent>

            {/* 7. Certifications */}
            <TabsContent value="certifications" className="mt-4">
              <SectionCard
                title="Certifications"
                description="Licenses and certifications."
                icon={SECTION_ICON.certifications}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <div className="space-y-3">
                    {draft.certifications.map((entry, index) => (
                      <CertificationEntryEditor
                        key={index}
                        entry={entry}
                        linkError={errorFor(
                          `certifications.${index}.link`
                        )?.message}
                        onChange={(next) => {
                          const list = [...draft.certifications];
                          list[index] = next;
                          updateDraft({ certifications: list });
                        }}
                        onRemove={() =>
                          updateDraft({
                            certifications: draft.certifications.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                      />
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={ADD_BUTTON}
                      onClick={() =>
                        updateDraft({
                          certifications: [
                            ...draft.certifications,
                            emptyCertification(),
                          ],
                        })
                      }
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                      Add certification
                    </Button>
                  </div>
                ) : values.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {values.certifications.map((entry, index) => (
                      <CertificationEntryView
                        key={`${entry.name}-${index}`}
                        entry={entry}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyHint />
                )}
              </SectionCard>
            </TabsContent>

            {/* 8. Additional information */}
            <TabsContent value="additional" className="mt-4">
              <SectionCard
                title="Additional information"
                description="Awards, languages, achievements, or anything else worth noting."
                icon={SECTION_ICON.additional}
                isEditing={editing}
                isSaving={saving}
                onEdit={startEdit}
                onSave={() => void saveDraft()}
                onCancel={cancelEdit}
              >
                {editing ? (
                  <Field>
                    <FieldLabel htmlFor="profile-additional" className="text-zinc-300!">
                      Details
                    </FieldLabel>
                    <DarkTextarea
                      id="profile-additional"
                      rows={4}
                      value={draft.additional_info}
                      onChange={(event) =>
                        updateDraft({
                          additional_info: event.target.value,
                        })
                      }
                    />
                  </Field>
                ) : (
                  <EmptyHint>
                    {values.additional_info ? (
                      <p className="text-xs/relaxed whitespace-pre-line leading-relaxed text-zinc-300">
                        {values.additional_info}
                      </p>
                    ) : undefined}
                  </EmptyHint>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side column: animated completeness card */}
        <aside className="lg:w-[340px] xl:w-[360px] lg:shrink-0">
          <div className="lg:sticky lg:top-6">
            <ProfileCompletenessCard
              values={completenessValues}
              onSelectSection={handleSelectSection}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Work experience ---------- */

function WorkEntryView({ entry }: { entry: WorkExperienceEntry }) {
  return (
    <EntryTile>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">
            {entry.job_title || "Role"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {entry.company || "Company"}
            {entry.duration ? ` · ${entry.duration}` : ""}
          </p>
        </div>
        {(entry.start_date || entry.end_date) && (
          <DateChip>
            {[entry.start_date, entry.end_date || "Present"]
              .filter(Boolean)
              .join(" — ")}
          </DateChip>
        )}
      </div>
      {entry.responsibilities.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-xs/relaxed text-zinc-400 marker:text-zinc-600">
          {entry.responsibilities.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </EntryTile>
  );
}

function WorkEntryEditor({
  entry,
  onChange,
  onRemove,
}: {
  entry: WorkExperienceEntry;
  onChange: (entry: WorkExperienceEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="work-company" className="text-zinc-300!">
            Company
          </FieldLabel>
          <DarkInput
            id="work-company"
            value={entry.company}
            onChange={(event) =>
              onChange({ ...entry, company: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="work-title" className="text-zinc-300!">
            Job title
          </FieldLabel>
          <DarkInput
            id="work-title"
            value={entry.job_title}
            onChange={(event) =>
              onChange({ ...entry, job_title: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="work-start" className="text-zinc-300!">
            Start
          </FieldLabel>
          <DarkInput
            id="work-start"
            placeholder="e.g. Jan 2022"
            value={entry.start_date}
            onChange={(event) =>
              onChange({ ...entry, start_date: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="work-end" className="text-zinc-300!">
            End
          </FieldLabel>
          <DarkInput
            id="work-end"
            placeholder="e.g. Mar 2024 or Present"
            value={entry.end_date}
            onChange={(event) =>
              onChange({ ...entry, end_date: event.target.value })
            }
          />
        </Field>
      </div>
      <Field>
        <FieldLabel
          htmlFor="work-responsibilities"
          className="text-zinc-300!"
        >
          Responsibilities (one per line)
        </FieldLabel>
        <DarkTextarea
          id="work-responsibilities"
          rows={3}
          value={entry.responsibilities.join("\n")}
          onChange={(event) =>
            onChange({
              ...entry,
              responsibilities: event.target.value
                .split("\n")
                .map((line) => line.trimStart()),
            })
          }
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("self-start", REMOVE_BUTTON)}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
        Remove role
      </Button>
    </div>
  );
}

/* ---------- Education ---------- */

function EducationEntryView({ entry }: { entry: EducationEntry }) {
  return (
    <EntryTile>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">
            {entry.degree || entry.field || "Education"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {entry.institution || "Institution"}
          </p>
        </div>
        {(entry.start_year || entry.end_year) && (
          <DateChip>
            {[entry.start_year, entry.end_year].filter(Boolean).join(" — ")}
          </DateChip>
        )}
      </div>
      {entry.details && (
        <p className="text-xs/relaxed text-zinc-400">{entry.details}</p>
      )}
    </EntryTile>
  );
}

function EducationEntryEditor({
  entry,
  onChange,
  onRemove,
}: {
  entry: EducationEntry;
  onChange: (entry: EducationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="education-institution" className="text-zinc-300!">
            Institution
          </FieldLabel>
          <DarkInput
            id="education-institution"
            value={entry.institution}
            onChange={(event) =>
              onChange({ ...entry, institution: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="education-degree" className="text-zinc-300!">
            Degree
          </FieldLabel>
          <DarkInput
            id="education-degree"
            value={entry.degree}
            onChange={(event) =>
              onChange({ ...entry, degree: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="education-field" className="text-zinc-300!">
            Field of study
          </FieldLabel>
          <DarkInput
            id="education-field"
            value={entry.field}
            onChange={(event) =>
              onChange({ ...entry, field: event.target.value })
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field>
            <FieldLabel htmlFor="education-start" className="text-zinc-300!">
              Start year
            </FieldLabel>
            <DarkInput
              id="education-start"
              placeholder="2020"
              value={entry.start_year}
              onChange={(event) =>
                onChange({ ...entry, start_year: event.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="education-end" className="text-zinc-300!">
              End year
            </FieldLabel>
            <DarkInput
              id="education-end"
              placeholder="2024"
              value={entry.end_year}
              onChange={(event) =>
                onChange({ ...entry, end_year: event.target.value })
              }
            />
          </Field>
        </div>
      </div>
      <Field>
        <FieldLabel htmlFor="education-details" className="text-zinc-300!">
          Details
        </FieldLabel>
        <DarkTextarea
          id="education-details"
          rows={2}
          placeholder="GPA, honors, relevant coursework…"
          value={entry.details}
          onChange={(event) =>
            onChange({ ...entry, details: event.target.value })
          }
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("self-start", REMOVE_BUTTON)}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
        Remove education
      </Button>
    </div>
  );
}

/* ---------- Projects ---------- */

function ProjectEntryView({ entry }: { entry: ProjectEntry }) {
  return (
    <EntryTile>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-100">
          {entry.name || "Project"}
        </p>
        {entry.link && isUrlish(entry.link) && (
          <Badge
            variant="outline"
            className={CHIP}
            render={
              <a
                href={withProtocol(entry.link)}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            Link
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              strokeWidth={2}
              className="size-2.5 opacity-60"
            />
          </Badge>
        )}
      </div>
      {entry.description && (
        <p className="text-xs/relaxed text-zinc-400">{entry.description}</p>
      )}
      {entry.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tech_stack.map((tech, index) => (
            <Badge key={`${tech}-${index}`} variant="secondary" className={CHIP}>
              {tech}
            </Badge>
          ))}
        </div>
      )}
    </EntryTile>
  );
}

function ProjectEntryEditor({
  entry,
  linkError,
  onChange,
  onRemove,
}: {
  entry: ProjectEntry;
  linkError?: string;
  onChange: (entry: ProjectEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="project-name" className="text-zinc-300!">
            Name
          </FieldLabel>
          <DarkInput
            id="project-name"
            value={entry.name}
            onChange={(event) =>
              onChange({ ...entry, name: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="project-link" className="text-zinc-300!">
            Link
          </FieldLabel>
          <DarkInput
            id="project-link"
            placeholder="https://github.com/you/project"
            aria-invalid={Boolean(linkError)}
            value={entry.link}
            onChange={(event) =>
              onChange({ ...entry, link: event.target.value })
            }
          />
          <FieldError
            className="text-xs text-red-400"
            errors={[{ message: linkError }]}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="project-description" className="text-zinc-300!">
          Description
        </FieldLabel>
        <DarkTextarea
          id="project-description"
          rows={3}
          value={entry.description}
          onChange={(event) =>
            onChange({ ...entry, description: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel className="text-zinc-300!">Tech stack</FieldLabel>
        <TagEditor
          tags={entry.tech_stack}
          placeholder="e.g. TypeScript, and press Enter"
          onChange={(tech_stack) => onChange({ ...entry, tech_stack })}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("self-start", REMOVE_BUTTON)}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
        Remove project
      </Button>
    </div>
  );
}

/* ---------- Certifications ---------- */

function CertificationEntryView({ entry }: { entry: CertificationEntry }) {
  return (
    <EntryTile>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">
            {entry.name || "Certification"}
          </p>
          {entry.issuer && (
            <p className="mt-0.5 text-xs text-zinc-400">{entry.issuer}</p>
          )}
        </div>
        {entry.date && <DateChip>{entry.date}</DateChip>}
      </div>
      {entry.link && isUrlish(entry.link) && (
        <div>
          <Badge
            variant="outline"
            className={CHIP}
            render={
              <a
                href={withProtocol(entry.link)}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            Link
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              strokeWidth={2}
              className="size-2.5 opacity-60"
            />
          </Badge>
        </div>
      )}
    </EntryTile>
  );
}

function CertificationEntryEditor({
  entry,
  linkError,
  onChange,
  onRemove,
}: {
  entry: CertificationEntry;
  linkError?: string;
  onChange: (entry: CertificationEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="certification-name" className="text-zinc-300!">
            Name
          </FieldLabel>
          <DarkInput
            id="certification-name"
            value={entry.name}
            onChange={(event) =>
              onChange({ ...entry, name: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="certification-issuer" className="text-zinc-300!">
            Issuer
          </FieldLabel>
          <DarkInput
            id="certification-issuer"
            value={entry.issuer}
            onChange={(event) =>
              onChange({ ...entry, issuer: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="certification-date" className="text-zinc-300!">
            Date
          </FieldLabel>
          <DarkInput
            id="certification-date"
            placeholder="e.g. 2024"
            value={entry.date}
            onChange={(event) =>
              onChange({ ...entry, date: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="certification-link" className="text-zinc-300!">
            Link
          </FieldLabel>
          <DarkInput
            id="certification-link"
            placeholder="https://credential.example/abc"
            aria-invalid={Boolean(linkError)}
            value={entry.link}
            onChange={(event) =>
              onChange({ ...entry, link: event.target.value })
            }
          />
          <FieldError
            className="text-xs text-red-400"
            errors={[{ message: linkError }]}
          />
        </Field>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("self-start", REMOVE_BUTTON)}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
        Remove certification
      </Button>
    </div>
  );
}

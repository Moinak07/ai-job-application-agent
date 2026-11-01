"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Briefcase01Icon,
  HatIcon,
  InformationCircleIcon,
  Medal01Icon,
  RocketIcon,
  SparkleIcon,
  TextIcon,
  ToolboxIcon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import type { ProfileFormValues } from "@/lib/profile";
import { Button } from "@/components/ui/button";

/** The profile sections a tab/panel can be navigated to. */
export type ProfileSectionKey =
  | "personal"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "additional";

export type SectionIcon = React.ComponentProps<typeof HugeiconsIcon>["icon"];

/** Per-section icons — the single source shared by tabs and suggestions. */
const SECTION_ICON: Record<ProfileSectionKey, SectionIcon> = {
  personal: UserIcon,
  summary: TextIcon,
  skills: ToolboxIcon,
  experience: Briefcase01Icon,
  education: HatIcon,
  projects: RocketIcon,
  certifications: Medal01Icon,
  additional: InformationCircleIcon,
};

/** Tab metadata shared with the profile view's tab bar. */
export const PROFILE_SECTIONS: {
  id: ProfileSectionKey;
  label: string;
  icon: SectionIcon;
}[] = [
  { id: "personal", label: "Personal", icon: SECTION_ICON.personal },
  { id: "summary", label: "Summary", icon: SECTION_ICON.summary },
  { id: "skills", label: "Skills", icon: SECTION_ICON.skills },
  { id: "experience", label: "Work", icon: SECTION_ICON.experience },
  { id: "education", label: "Education", icon: SECTION_ICON.education },
  { id: "projects", label: "Projects", icon: SECTION_ICON.projects },
  { id: "certifications", label: "Certifications", icon: SECTION_ICON.certifications },
  { id: "additional", label: "Additional", icon: SECTION_ICON.additional },
];

export type ProfileCompletenessCheck = {
  section: ProfileSectionKey;
  label: string;
  filled: boolean;
};

/** Every field group that counts towards profile completeness. */
export function getProfileCompletenessChecks(
  values: ProfileFormValues
): ProfileCompletenessCheck[] {
  return [
    { section: "personal", label: "Full name", filled: Boolean(values.full_name.trim()) },
    { section: "personal", label: "Headline", filled: Boolean(values.headline.trim()) },
    { section: "personal", label: "Location", filled: Boolean(values.location.trim()) },
    { section: "personal", label: "Phone", filled: Boolean(values.phone.trim()) },
    { section: "personal", label: "Links", filled: values.links.length > 0 },
    {
      section: "summary",
      label: "Professional summary",
      filled: Boolean(values.professional_summary.trim()),
    },
    { section: "skills", label: "Skills", filled: values.skills.length > 0 },
    {
      section: "experience",
      label: "Work experience",
      filled: values.work_experience.length > 0,
    },
    { section: "education", label: "Education", filled: values.education.length > 0 },
    { section: "projects", label: "Projects", filled: values.projects.length > 0 },
    {
      section: "certifications",
      label: "Certifications",
      filled: values.certifications.length > 0,
    },
    {
      section: "additional",
      label: "Additional info",
      filled: Boolean(values.additional_info.trim()),
    },
  ];
}

export type ProfileCompleteness = {
  /** 0-100, rounded. */
  percent: number;
  filledCount: number;
  total: number;
  missing: ProfileCompletenessCheck[];
};

/** Pure: computes completeness from profile data. */
export function getProfileCompleteness(
  values: ProfileFormValues
): ProfileCompleteness {
  const checks = getProfileCompletenessChecks(values);
  const missing = checks.filter((check) => !check.filled);
  const filledCount = checks.length - missing.length;
  return {
    percent: Math.round((filledCount / checks.length) * 100),
    filledCount,
    total: checks.length,
    missing,
  };
}

/** Color tiers by completion: red → orange → blue → green. */
function completenessTone(percent: number) {
  if (percent >= 80) {
    return {
      label: "Excellent",
      ring: "stroke-emerald-400",
      text: "text-emerald-400",
      glow: "bg-emerald-500/40",
      ctaGradient: "from-emerald-500 to-teal-600",
      ctaShadow: "shadow-emerald-500/25",
      doneBg: "bg-emerald-500/10",
      doneText: "text-emerald-400",
      doneBorder: "border-emerald-500/20",
    };
  }
  if (percent >= 50) {
    return {
      label: "Looking good",
      ring: "stroke-blue-400",
      text: "text-blue-400",
      glow: "bg-blue-500/40",
      ctaGradient: "from-blue-600 to-indigo-600",
      ctaShadow: "shadow-blue-600/30",
      doneBg: "bg-blue-500/10",
      doneText: "text-blue-400",
      doneBorder: "border-blue-500/20",
    };
  }
  if (percent >= 25) {
    return {
      label: "Getting there",
      ring: "stroke-orange-400",
      text: "text-orange-400",
      glow: "bg-orange-500/40",
      ctaGradient: "from-orange-500 to-amber-600",
      ctaShadow: "shadow-orange-600/25",
      doneBg: "bg-orange-500/10",
      doneText: "text-orange-400",
      doneBorder: "border-orange-500/20",
    };
  }
  return {
    label: "Just started",
    ring: "stroke-rose-400",
    text: "text-rose-400",
    glow: "bg-rose-500/40",
    ctaGradient: "from-rose-500 to-red-600",
    ctaShadow: "shadow-rose-600/25",
    doneBg: "bg-rose-500/10",
    doneText: "text-rose-400",
    doneBorder: "border-rose-500/20",
  };
}

/** Animates a number towards its target with an ease-out curve. */
function useCountUp(target: number, durationMs = 650): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target) {
      return;
    }

    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return display;
}

/** Large SVG ring with an eased fill animation and a counting percentage. */
function CircularProgress({
  percent,
  tone,
}: {
  percent: number;
  tone: ReturnType<typeof completenessTone>;
}) {
  const display = useCountUp(percent);
  const size = 168;
  const radius = 68;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto w-fit">
      {/* Soft colored glow behind the ring */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-3 rounded-full opacity-20 blur-3xl",
          tone.glow
        )}
      />
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="relative size-40 -rotate-90"
        role="img"
        aria-label={`Profile ${percent}% complete`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-zinc-800"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            tone.ring
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className={cn(
            "text-3xl font-bold tabular-nums tracking-tight",
            tone.text
          )}
        >
          {display}%
        </span>
        <span className="text-[0.6875rem] font-medium text-zinc-500">
          {tone.label}
        </span>
      </div>
    </div>
  );
}

/**
 * Premium profile-completeness side card: a large animated circular
 * progress ring with a counting percentage, tiered colors by completion
 * (red / orange / blue / green), filled/missing field counts, clickable
 * missing-section suggestions, and a prominent colored Complete Profile
 * button. Pass live draft data to make it update while editing.
 */
export function ProfileCompletenessCard({
  values,
  onSelectSection,
}: {
  values: ProfileFormValues;
  /** When provided, suggestions and the CTA navigate to that section. */
  onSelectSection?: (section: ProfileSectionKey) => void;
}) {
  const { percent, filledCount, total, missing } =
    getProfileCompleteness(values);
  const tone = completenessTone(percent);
  const next = missing[0];
  const shownMissing = missing.slice(0, 6);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-700/70 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 shadow-2xl shadow-black/30">
      {/* Header */}
      <div className="border-b border-zinc-800/80 px-5 pt-4 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 ring-1 ring-inset ring-blue-500/25">
            <HugeiconsIcon
              icon={SparkleIcon}
              strokeWidth={1.75}
              className="size-4"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
              Profile completeness
            </h3>
            <p className="truncate text-xs text-zinc-500">
              A complete profile powers tailored applications.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-6">
        <CircularProgress percent={percent} tone={tone} />

        {/* Stats row */}
        <div className="grid grid-cols-2 divide-x divide-zinc-800/80 rounded-xl border border-zinc-800/90 bg-zinc-950/60">
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold tabular-nums text-zinc-100">
              {filledCount}
              <span className="text-xs font-medium text-zinc-500">
                /{total}
              </span>
            </p>
            <p className="text-[0.6875rem] text-zinc-500">fields filled</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                missing.length > 0 ? "text-zinc-100" : tone.text
              )}
            >
              {missing.length}
            </p>
            <p className="text-[0.6875rem] text-zinc-500">to improve</p>
          </div>
        </div>

        {missing.length > 0 ? (
          <>
            <div className="space-y-2.5">
              <p className="text-xs font-medium tracking-wide text-zinc-400">
                Suggested next steps
              </p>
              <div className="flex flex-wrap gap-1.5">
                {shownMissing.map((check) => (
                  <button
                    key={check.label}
                    type="button"
                    onClick={() => onSelectSection?.(check.section)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-700/70 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-400 transition-all hover:border-blue-500/40 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <HugeiconsIcon
                      icon={SECTION_ICON[check.section]}
                      strokeWidth={1.75}
                      className="size-3 text-zinc-500 transition-colors group-hover:text-blue-400"
                    />
                    {check.label}
                    <HugeiconsIcon
                      icon={Add01Icon}
                      strokeWidth={2}
                      className="size-2.5 opacity-50 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                ))}
                {missing.length > shownMissing.length && (
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs text-zinc-500">
                    +{missing.length - shownMissing.length} more
                  </span>
                )}
              </div>
            </div>

            {onSelectSection && next && (
              <Button
                type="button"
                className={cn(
                  "w-full bg-gradient-to-r text-white shadow-lg",
                  tone.ctaGradient,
                  tone.ctaShadow
                )}
                onClick={() => onSelectSection(next.section)}
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                Complete profile
              </Button>
            )}
          </>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-xl border px-4 py-4",
              tone.doneBorder,
              tone.doneBg
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full",
                tone.doneBg,
                tone.doneText
              )}
            >
              <HugeiconsIcon
                icon={Tick02Icon}
                strokeWidth={2}
                className="size-4"
              />
            </span>
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  tone.doneText
                )}
              >
                All sections filled
              </p>
              <p className="text-xs text-zinc-500">
                Your profile is ready for applications.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

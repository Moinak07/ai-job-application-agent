import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { createClient } from "@/lib/supabase/server";
import { RESUMES_TABLE_NAME } from "@/lib/resumes";
import { ResumeList, type ResumeListItem } from "@/components/dashboard/resume/resume-list";
import { UploadCard } from "@/components/dashboard/resume/upload-card";

export default async function ResumePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // The dashboard layout redirects unauthenticated users; this keeps the
  // page safe even if it is ever rendered outside that layout.
  if (authError || !user) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">Resume</h2>
        <p className="text-zinc-400">Please sign in again to manage your resumes.</p>
      </div>
    );
  }

  const { data: resumes, error: resumesError } = await supabase
    .from(RESUMES_TABLE_NAME)
    .select("*, resume_extractions(status, error, model, updated_at)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Resume</h2>
        <p className="text-zinc-400">
          Manage and upload your resumes here. Analyzed resumes keep your
          profile up to date.
        </p>
      </div>

      {resumesError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <HugeiconsIcon
            icon={AlertCircleIcon}
            strokeWidth={2}
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            Your resumes could not be loaded. The database may be missing the
            latest schema — run the SQL from supabase/schema.sql in Supabase,
            then reload this page.
          </p>
        </div>
      )}

      <UploadCard userId={user.id} />

      {!resumesError && resumes && resumes.length > 0 && (
        <ResumeList resumes={resumes as ResumeListItem[]} />
      )}
    </div>
  );
}

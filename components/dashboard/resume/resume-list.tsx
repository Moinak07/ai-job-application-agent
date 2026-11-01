"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  AiMagicIcon,
  Cancel01Icon,
  Download04Icon,
  FileAttachmentIcon,
} from "@hugeicons/core-free-icons";
import { createClient } from "@/lib/supabase/client";
import { RESUME_BUCKET_NAME, formatFileSize } from "@/lib/resumes";
import { deleteResume, parseResume } from "@/app/dashboard/resume/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToastManager } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type ResumeListItem = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  created_at: string | null;
  resume_extractions: {
    status: string;
    error: string | null;
    model: string | null;
    updated_at: string | null;
  } | null;
};

function StatusBadge({ resume }: { resume: ResumeListItem }) {
  const extraction = resume.resume_extractions;

  if (!extraction) {
    return <Badge variant="outline">Not parsed yet</Badge>;
  }
  if (extraction.status === "succeeded") {
    return <Badge variant="secondary">Parsed</Badge>;
  }
  return <Badge variant="destructive">Failed</Badge>;
}

export function ResumeList({ resumes }: { resumes: ResumeListItem[] }) {
  const router = useRouter();
  const toastManager = useToastManager();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDownload = async (resume: ResumeListItem) => {
    setDownloadingId(resume.id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(RESUME_BUCKET_NAME)
        .createSignedUrl(resume.storage_path, 60);

      if (error || !data?.signedUrl) {
        toastManager.add({
          title: "Could not generate a download link. Please try again.",
          type: "error",
        });
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener");
    } catch {
      toastManager.add({
        title: "Could not generate a download link. Please try again.",
        type: "error",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleReparse = async (resume: ResumeListItem) => {
    setBusyId(resume.id);
    try {
      const result = await parseResume(resume.id);
      if (result.ok) {
        toastManager.add({
          title: "Resume analyzed",
          description: "Your profile has been updated with the extracted details.",
          type: "success",
        });
      } else {
        toastManager.add({ title: result.error, type: "error" });
      }
      router.refresh();
    } catch {
      toastManager.add({
        title: "We couldn't analyze that resume. Please try again.",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (resume: ResumeListItem) => {
    setBusyId(resume.id);
    try {
      const result = await deleteResume(resume.id);
      if (result.ok) {
        toastManager.add({ title: "Resume deleted", type: "success" });
      } else {
        toastManager.add({ title: result.error, type: "error" });
      }
      router.refresh();
    } catch {
      toastManager.add({
        title: "Could not delete that resume. Please try again.",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {resumes.map((resume) => {
        const extraction = resume.resume_extractions;
        const isBusy = busyId === resume.id;

        return (
          <Card key={resume.id} size="sm">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <HugeiconsIcon
                  icon={FileAttachmentIcon}
                  strokeWidth={1.5}
                  className="size-5"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {resume.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resume.created_at
                    ? `Uploaded ${format(new Date(resume.created_at), "MMM d, yyyy")}`
                    : "Upload date unknown"}
                  {resume.file_size ? ` · ${formatFileSize(resume.file_size)}` : ""}
                </p>
                {extraction?.status === "failed" && extraction.error && (
                  <div
                    role="alert"
                    className="flex items-start gap-1.5 pt-1 text-xs text-destructive"
                  >
                    <HugeiconsIcon
                      icon={AlertCircleIcon}
                      strokeWidth={2}
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span className="line-clamp-2">{extraction.error}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge resume={resume} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload(resume)}
                  disabled={downloadingId === resume.id}
                >
                  {downloadingId === resume.id ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <HugeiconsIcon
                      icon={Download04Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                  )}
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleReparse(resume)}
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <HugeiconsIcon
                      icon={AiMagicIcon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                  )}
                  {extraction?.status === "failed" ? "Retry" : "Re-parse"}
                </Button>
                <AlertDialog
                  open={confirmDeleteId === resume.id}
                  onOpenChange={(open) =>
                    setConfirmDeleteId(open ? resume.id : null)
                  }
                >
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isBusy}
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                    Delete
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
                      <AlertDialogDescription>
                        “{resume.file_name}” and its analysis record will be
                        removed. Your profile stays as it is.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                          // AlertDialogAction is a plain button in this kit,
                          // so the dialog is closed explicitly here.
                          setConfirmDeleteId(null);
                          void handleDelete(resume);
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

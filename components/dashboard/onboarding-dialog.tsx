"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/client";
import {
  RESUME_BUCKET_NAME,
  RESUME_INPUT_ACCEPT,
  RESUMES_TABLE_NAME,
  buildResumeStoragePath,
  formatFileSize,
  validateResumeFile,
} from "@/lib/resumes";
import { parseResume } from "@/app/dashboard/resume/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type UploadStatus = "idle" | "uploading" | "parsing" | "error" | "success";

type UploadError = {
  message: string;
  detail?: string;
};

const FILE_INPUT_ID = "onboarding-resume-input";

export function OnboardingDialog({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<UploadError | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isUploading = status === "uploading";

  const upload = useCallback(
    async (fileToUpload: File) => {
      setStatus("uploading");
      setError(null);

      try {
        const storagePath = buildResumeStoragePath(userId, fileToUpload.name);
        const supabase = createClient();

        const { error: uploadError } = await supabase.storage
          .from(RESUME_BUCKET_NAME)
          .upload(storagePath, fileToUpload, {
            contentType: fileToUpload.type || "application/octet-stream",
          });

        if (uploadError) {
          setStatus("error");
          setError({
            message: "Upload failed. Please try again.",
            detail: uploadError.message,
          });
          return;
        }

        const { data: inserted, error: insertError } = await supabase
          .from(RESUMES_TABLE_NAME)
          .insert({
            user_id: userId,
            file_name: fileToUpload.name,
            storage_path: storagePath,
            file_size: fileToUpload.size,
            mime_type: fileToUpload.type || null,
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          // The table row is what the dashboard gate checks; without it the
          // dialog would reappear, so remove the orphaned object and let the
          // user retry. Best-effort: never mask the insert error.
          await supabase.storage
            .from(RESUME_BUCKET_NAME)
            .remove([storagePath])
            .catch(() => undefined);
          setStatus("error");
          setError({
            message:
              "The file was uploaded but could not be recorded. Please try again.",
            detail: insertError?.message,
          });
          return;
        }

        // Upload is done and the gate is cleared; analyze the resume before
        // closing. A parse failure still completes onboarding — the Resume
        // page offers a re-parse with the stored error.
        setStatus("parsing");
        try {
          await parseResume(inserted.id);
        } catch {
          // The server action returns structured errors; an exception here
          // (e.g. the network dropping mid-call) is handled the same way.
        }
        setStatus("success");
      } catch (err) {
        // Unexpected failures (e.g. the browser going offline mid-upload)
        // must not leave the dialog stuck in the uploading state.
        setStatus("error");
        setError({
          message: "Upload failed. Please try again.",
          detail: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [userId]
  );

  // Brief success confirmation, then close so the refreshed layout can
  // unmount the dialog (the gate now sees a resume row).
  useEffect(() => {
    if (status !== "success") {
      return;
    }
    const timer = setTimeout(() => {
      setOpen(false);
      router.refresh();
    }, 800);
    return () => clearTimeout(timer);
  }, [status, router]);

  const handleFileSelected = (selected: File | null) => {
    if (!selected || isUploading) {
      return;
    }

    const validation = validateResumeFile(selected);
    if (!validation.valid) {
      setFile(null);
      setError({ message: validation.reason });
      setStatus("idle");
      return;
    }

    setFile(selected);
    setError(null);
    setStatus("idle");
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    // Reset the value so picking the same file again re-fires onChange.
    event.target.value = "";
    handleFileSelected(selected);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelected(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <Dialog
      open={open}
      // This dialog can only be closed by a successful upload. Escape and
      // backdrop-press close requests land here and are deliberately ignored.
      onOpenChange={() => {}}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {status === "success" || status === "parsing" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                status === "parsing"
                  ? "bg-primary/10 text-primary"
                  : "bg-emerald-100 text-emerald-600"
              )}
            >
              {status === "parsing" ? (
                <Spinner className="size-6" />
              ) : (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={2}
                  className="size-6"
                />
              )}
            </div>
            <DialogHeader className="items-center">
              <DialogTitle>Resume uploaded</DialogTitle>
              <DialogDescription>
                {status === "parsing"
                  ? "Analyzing your resume…"
                  : "Setting up your dashboard…"}
              </DialogDescription>
            </DialogHeader>
            {status === "parsing" && (
              <p className="text-xs text-muted-foreground">
                This usually takes a few seconds. You can close this tab
                afterwards.
              </p>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to your dashboard</DialogTitle>
              <DialogDescription>
                Upload your resume to continue. It powers your tailored job
                applications — you only need to do this once.
              </DialogDescription>
            </DialogHeader>

            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-input bg-muted/40 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  <HugeiconsIcon
                    icon={Upload04Icon}
                    strokeWidth={1.5}
                    className="size-5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ) : (
              <label
                htmlFor={FILE_INPUT_ID}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isUploading) {
                    setIsDragging(true);
                  }
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-6 py-10 text-center transition-colors hover:bg-muted/60",
                  isDragging && "border-ring bg-accent"
                )}
              >
                <HugeiconsIcon
                  icon={Upload04Icon}
                  strokeWidth={1.5}
                  className="size-8 text-muted-foreground"
                />
                <span className="text-sm font-medium text-foreground">
                  Drag and drop your resume here
                </span>
                <span className="text-xs text-muted-foreground">
                  or click to browse
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, DOCX, or TXT — up to 5 MB
                </span>
                <input
                  id={FILE_INPUT_ID}
                  type="file"
                  accept={RESUME_INPUT_ACCEPT}
                  className="sr-only"
                  disabled={isUploading}
                  onChange={handleInputChange}
                />
              </label>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  strokeWidth={2}
                  className="mt-0.5 size-4 shrink-0"
                />
                <div className="space-y-0.5">
                  <p>{error.message}</p>
                  {error.detail && <p className="opacity-75">{error.detail}</p>}
                </div>
              </div>
            )}

            {isUploading && file && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Uploading {file.name}…
                </p>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                </div>
              </div>
            )}

            {file && !isUploading && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setError(null);
                  }}
                >
                  Choose another file
                </Button>
                <Button onClick={() => void upload(file)}>
                  {status === "error" ? "Try again" : "Upload resume"}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

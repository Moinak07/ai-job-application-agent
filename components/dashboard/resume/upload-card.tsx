"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Upload04Icon } from "@hugeicons/core-free-icons";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToastManager } from "@/components/ui/toast";

type UploadStatus = "idle" | "uploading" | "parsing" | "error";

const FILE_INPUT_ID = "resume-page-upload-input";

export function UploadCard({ userId }: { userId: string }) {
  const router = useRouter();
  const toastManager = useToastManager();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isWorking = status === "uploading" || status === "parsing";

  const handleFileSelected = (selected: File | null) => {
    if (!selected || isWorking) {
      return;
    }

    const validation = validateResumeFile(selected);
    if (!validation.valid) {
      setFile(null);
      setStatus("idle");
      setError(validation.reason);
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

  const upload = async (fileToUpload: File) => {
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
        setError("Upload failed. Please try again.");
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
        // The row is the record of the upload; without it the file would be
        // invisible, so remove the orphaned object and let the user retry.
        await supabase.storage
          .from(RESUME_BUCKET_NAME)
          .remove([storagePath])
          .catch(() => undefined);
        setStatus("error");
        setError("The file was uploaded but could not be recorded. Please try again.");
        return;
      }

      // The row exists, so the resume is safely stored. Analyze it now; a
      // parse failure does not undo the upload — the list below shows the
      // failed status with a retry action.
      setStatus("parsing");
      const result = await parseResume(inserted.id).catch(() => null);

      if (result?.ok) {
        toastManager.add({
          title: "Resume analyzed",
          description: "Your profile has been updated with the extracted details.",
          type: "success",
        });
      } else {
        toastManager.add({
          title: result && !result.ok
            ? result.error
            : "We couldn't analyze that resume. Please try again.",
          type: "error",
        });
      }

      setFile(null);
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
      setError("Upload failed. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add another resume</CardTitle>
        <CardDescription>
          PDF, DOCX, or TXT — up to 5 MB. We&lsquo;ll analyze it and update
          your profile with anything new.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label
          htmlFor={FILE_INPUT_ID}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isWorking) {
              setIsDragging(true);
            }
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-6 py-8 text-center transition-colors hover:bg-muted/60",
            isDragging && "border-ring bg-accent",
            isWorking && "pointer-events-none opacity-70"
          )}
        >
          <HugeiconsIcon
            icon={Upload04Icon}
            strokeWidth={1.5}
            className="size-7 text-muted-foreground"
          />
          {status === "parsing" ? (
            <>
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Spinner className="size-3.5" />
                Analyzing {file?.name}…
              </span>
              <span className="text-xs text-muted-foreground">
                This usually takes a few seconds.
              </span>
            </>
          ) : status === "uploading" ? (
            <>
              <span className="text-sm font-medium text-foreground">
                Uploading {file?.name}
                {file ? ` (${formatFileSize(file.size)})` : ""}…
              </span>
              <span className="text-xs text-muted-foreground">
                Hang tight, this is quick.
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">
                Drag and drop another resume here
              </span>
              <span className="text-xs text-muted-foreground">
                or click to browse
              </span>
            </>
          )}
          <input
            id={FILE_INPUT_ID}
            type="file"
            accept={RESUME_INPUT_ACCEPT}
            className="sr-only"
            disabled={isWorking}
            onChange={handleInputChange}
          />
        </label>

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
            <div className="flex-1 space-y-1">
              <p>{error}</p>
              {file && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void upload(file)}
                >
                  Try again
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

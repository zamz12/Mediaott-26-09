"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RequestUploadResult {
  uploadUrl: string;
  uploadSessionId: string;
}

interface DirectUploaderProps {
  accept?: string;
  requestUpload: (fileName: string, contentType: string, sizeBytes: number) => Promise<RequestUploadResult>;
  confirmUpload: (uploadSessionId: string) => Promise<void>;
  onComplete?: () => void;
  label?: string;
}

type UploadState = "idle" | "requesting" | "uploading" | "confirming" | "done" | "error";

// Resumable-in-spirit direct-to-storage upload (Section 13): the browser
// PUTs the file straight to the signed URL — it never passes through this
// Next.js server as a request body. Only two small metadata calls touch it.
export function DirectUploader({ accept, requestUpload, confirmUpload, onComplete, label }: DirectUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      setState("requesting");
      const { uploadUrl, uploadSessionId } = await requestUpload(file.name, file.type || "application/octet-stream", file.size);

      setState("uploading");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      setState("confirming");
      await confirmUpload(uploadSessionId);

      setState("done");
      onComplete?.();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {state === "idle" || state === "error" ? (
        <>
          <UploadCloud className="mx-auto mb-2 text-[var(--color-fg-muted)]" size={28} />
          <p className="mb-3 text-sm text-[var(--color-fg-muted)]">{label ?? "Select a file to upload"}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
        </>
      ) : state === "done" ? (
        <p className="text-sm text-[var(--color-success)]">Upload complete.</p>
      ) : (
        <div>
          <p className="mb-2 text-sm text-[var(--color-fg-muted)]">
            {state === "uploading" ? `Uploading… ${progress}%` : "Processing…"}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${state === "uploading" ? progress : 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

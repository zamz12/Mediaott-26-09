"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DirectUploader } from "@/components/upload/direct-uploader";
import { createDraftForUploadAction, requestPlatformUploadAction, confirmPlatformUploadAction } from "./actions";

type Orientation = "LANDSCAPE" | "PORTRAIT";

export function PlatformUploadWizard() {
  const [title, setTitle] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("LANDSCAPE");
  const [contentId, setContentId] = useState<string | null>(null);
  const router = useRouter();

  if (!contentId) {
    return (
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const id = await createDraftForUploadAction(title);
          setContentId(id);
        }}
      >
        <div>
          <Label htmlFor="title">Working title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
        </div>
        <div>
          <Label>Video orientation</Label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="orientation"
                checked={orientation === "LANDSCAPE"}
                onChange={() => setOrientation("LANDSCAPE")}
              />
              Landscape (film / TV, widescreen)
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="orientation"
                checked={orientation === "PORTRAIT"}
                onChange={() => setOrientation("PORTRAIT")}
              />
              Mobile / portrait (shorts, vertical video)
            </label>
          </div>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            This only controls the player&rsquo;s aspect ratio — SD, HD and 4K quality renditions are generated
            automatically for adaptive streaming based on your source file&rsquo;s resolution, no need to pick one.
          </p>
        </div>
        <Button type="submit" disabled={title.trim().length < 2}>
          Continue to upload
        </Button>
      </form>
    );
  }

  return (
    <DirectUploader
      accept="video/*"
      label={`Upload the master file for "${title}"`}
      requestUpload={(fileName, contentType, sizeBytes) => requestPlatformUploadAction(contentId, fileName, contentType, sizeBytes)}
      confirmUpload={(uploadSessionId) => confirmPlatformUploadAction(contentId, uploadSessionId, orientation)}
      onComplete={() => router.push(`/creator-studio/content/${contentId}`)}
    />
  );
}

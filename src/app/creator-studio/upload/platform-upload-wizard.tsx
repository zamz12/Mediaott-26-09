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
          <Label>Video type</Label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="orientation"
                checked={orientation === "LANDSCAPE"}
                onChange={() => setOrientation("LANDSCAPE")}
              />
              Standard (landscape / TV)
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="orientation"
                checked={orientation === "PORTRAIT"}
                onChange={() => setOrientation("PORTRAIT")}
              />
              Mobile video (portrait / shorts)
            </label>
          </div>
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

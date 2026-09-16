import Link from "next/link";
import { clsx } from "clsx";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlatformUploadWizard } from "./platform-upload-wizard";
import { createExternalContentAction, publishVaultItemAction } from "./actions";

export const metadata = { title: "Upload" };

const TABS = ["platform", "external", "vault"] as const;

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ tab?: string; vaultItemId?: string }> }) {
  const { tab: rawTab, vaultItemId } = await searchParams;
  const user = await requireSessionUser();
  const tab = vaultItemId ? "vault" : (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as (typeof TABS)[number]) : "platform";

  const vaultItem = vaultItemId ? await prisma.vaultItem.findFirst({ where: { id: vaultItemId, userId: user.id } }) : null;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Upload</h1>

      <nav className="mb-6 flex gap-1 border-b border-[var(--color-border)] text-sm">
        {TABS.map((t) => (
          <Link key={t} href={`/creator-studio/upload?tab=${t}`} className={clsx("border-b-2 px-4 py-2 capitalize", tab === t ? "border-[var(--color-accent)] text-[var(--color-fg)]" : "border-transparent text-[var(--color-fg-muted)]")}>
            {t === "platform" ? "Upload file" : t === "external" ? "External link" : "From vault"}
          </Link>
        ))}
      </nav>

      {tab === "platform" && <PlatformUploadWizard />}

      {tab === "external" && (
        <form action={createExternalContentAction} className="space-y-4">
          <p className="text-sm text-[var(--color-fg-muted)]">
            Reference an approved external video (YouTube, Vimeo, Dailymotion, or another legally-embeddable source)
            instead of hosting the file on LOKAL. Never a re-stream from an unlicensed aggregator — only the actual
            rights holder&rsquo;s own official embed.
          </p>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="provider">Provider</Label>
            <select id="provider" name="provider" className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              <option value="YOUTUBE">YouTube</option>
              <option value="VIMEO">Vimeo</option>
              <option value="DAILYMOTION">Dailymotion</option>
              <option value="OTHER">Other (paste a full embed URL)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="externalVideoId">Video ID or embed URL</Label>
            <Input
              id="externalVideoId"
              name="externalVideoId"
              placeholder="YouTube/Vimeo/Dailymotion: the video ID (e.g. dQw4w9WgXcQ). Other: the full https://… embed URL."
              required
            />
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              For YouTube/Vimeo/Dailymotion, paste just the video ID from the URL — not the whole link. For
              &ldquo;Other&rdquo;, paste the complete embeddable URL (e.g. an official broadcaster&rsquo;s own live
              embed link from their channel).
            </p>
          </div>
          <Button type="submit">Create draft</Button>
        </form>
      )}

      {tab === "vault" && (
        <div>
          {vaultItem ? (
            <form action={publishVaultItemAction} className="space-y-4">
              <input type="hidden" name="vaultItemId" value={vaultItem.id} />
              <p className="text-sm text-[var(--color-fg-muted)]">
                Publishing <span className="font-medium text-[var(--color-fg)]">{vaultItem.fileName}</span> from your private vault.
              </p>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={vaultItem.fileName} required />
              </div>
              <Button type="submit">Start publishing</Button>
            </form>
          ) : (
            <p className="text-sm text-[var(--color-fg-muted)]">
              Choose a video from your{" "}
              <Link href="/account/vault" className="text-[var(--color-accent)]">
                Video Vault
              </Link>{" "}
              to publish it here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

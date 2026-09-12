import { redirect } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { listVaultItems } from "@/modules/vault/service";
import { prisma } from "@/lib/prisma";
import { DirectUploader } from "@/components/upload/direct-uploader";
import { Button } from "@/components/ui/button";
import { confirmVaultUploadAction, deleteVaultItemAction, requestVaultUploadAction } from "./actions";

export const metadata = { title: "My Video Vault" };

function formatBytes(bytes: bigint | number) {
  const n = Number(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = n;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

export default async function VaultPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/vault");

  const [items, quota] = await Promise.all([
    listVaultItems(user.id),
    prisma.storageQuota.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
  ]);

  const usedPct = Math.min(100, Math.round((Number(quota.usedBytes) / Number(quota.allocatedBytes)) * 100));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-bold">My Video Vault</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Private storage for your own footage. Nothing here is visible to anyone else until you publish it.
      </p>

      <div className="mb-6 rounded-xl border border-[var(--color-border)] p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>Storage used</span>
          <span>
            {formatBytes(quota.usedBytes)} / {formatBytes(quota.allocatedBytes)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[var(--color-accent)]" style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      <div className="mb-8">
        <DirectUploader
          accept="video/*"
          label="Upload a video to your private vault"
          requestUpload={requestVaultUploadAction}
          confirmUpload={confirmVaultUploadAction}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.fileName}</p>
              <p className="text-xs text-[var(--color-fg-muted)]">{formatBytes(item.sizeBytes)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!item.publishedContentId && (
                <Button href={`/creator-studio/upload?vaultItemId=${item.id}`} variant="secondary" size="sm">
                  Publish
                </Button>
              )}
              <form action={deleteVaultItemAction}>
                <input type="hidden" name="itemId" value={item.id} />
                <button type="submit" aria-label="Delete" className="focus-ring rounded-full p-2 text-[var(--color-danger)] hover:bg-white/5">
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">Your vault is empty.</p>}
      </ul>

      <Link href="/account" className="mt-8 inline-block text-sm text-[var(--color-accent)]">
        ← Back to account
      </Link>
    </div>
  );
}

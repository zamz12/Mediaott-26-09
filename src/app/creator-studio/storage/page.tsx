import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Storage" };

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

export default async function CreatorStoragePage() {
  const user = await requireSessionUser();
  const quota = await prisma.storageQuota.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  const usedPct = Math.min(100, Math.round((Number(quota.usedBytes) / Number(quota.allocatedBytes)) * 100));

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Storage</h1>
      <div className="rounded-xl border border-[var(--color-border)] p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>Used</span>
          <span>
            {formatBytes(quota.usedBytes)} / {formatBytes(quota.allocatedBytes)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[var(--color-accent)]" style={{ width: `${usedPct}%` }} />
        </div>
      </div>
      <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
        Additional storage tiers arrive with billing in a later phase. Manage individual files in your{" "}
        <Link href="/account/vault" className="text-[var(--color-accent)]">
          Video Vault
        </Link>
        .
      </p>
    </div>
  );
}

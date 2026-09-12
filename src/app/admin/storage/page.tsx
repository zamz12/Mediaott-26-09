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

export default async function AdminStoragePage() {
  const byKind = await prisma.storageAsset.groupBy({ by: ["kind"], _sum: { sizeBytes: true }, _count: { kind: true } });
  const quotaAgg = await prisma.storageQuota.aggregate({ _sum: { usedBytes: true, allocatedBytes: true } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Storage</h1>

      <div className="mb-6 rounded-xl border border-[var(--color-border)] p-4">
        <p className="mb-1 text-sm text-[var(--color-fg-muted)]">Total vault usage across all users</p>
        <p className="text-xl font-bold">
          {formatBytes(quotaAgg._sum.usedBytes ?? 0)} / {formatBytes(quotaAgg._sum.allocatedBytes ?? 0)}
        </p>
      </div>

      <h2 className="mb-2 text-lg font-semibold">By asset kind</h2>
      <ul className="space-y-2">
        {byKind.map((row) => (
          <li key={row.kind} className="flex justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <span>{row.kind.replace("_", " ")}</span>
            <span className="text-[var(--color-fg-muted)]">
              {row._count.kind} objects · {formatBytes(row._sum.sizeBytes ?? 0)}
            </span>
          </li>
        ))}
        {byKind.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No storage assets recorded yet.</p>}
      </ul>

      <p className="mt-6 text-xs text-[var(--color-fg-muted)]">
        Malaysian data residency: buckets live in AWS ap-southeast-5 in production (Section 15); this environment uses
        local-filesystem storage for development.
      </p>
    </div>
  );
}

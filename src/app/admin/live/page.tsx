import { Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Live" };

export default async function AdminLivePage() {
  const liveStreams = await prisma.liveStream.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Live</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        HLS pull and approved external embeds are supported by the data model today; RTMP/SRT ingestion and full
        production controls ship in Phase 2.
      </p>
      <ul className="space-y-2">
        {liveStreams.map((l) => (
          <li key={l.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <Radio size={14} className={l.isLive ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]"} />
            {l.ingestType} — {l.isLive ? "Live now" : "Not live"}
          </li>
        ))}
        {liveStreams.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No live streams configured yet.</p>}
      </ul>
    </div>
  );
}

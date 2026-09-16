import Link from "next/link";
import { Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLiveChannelAction, setLiveStatusAction } from "./actions";

export const metadata = { title: "Live" };

export default async function AdminLivePage() {
  const [liveStreams, channels] = await Promise.all([
    prisma.liveStream.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { videoAsset: { include: { content: { select: { title: true, slug: true } } } } },
    }),
    prisma.channel.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Live</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Carry an official broadcaster&rsquo;s own embed (e.g. a state broadcaster&rsquo;s live YouTube channel) as a
        Live TV title — never a re-stream from an unlicensed third-party aggregator. RTMP/SRT ingestion and full
        production controls ship in Phase 2; this covers embed-based live channels today.
      </p>

      <form action={createLiveChannelAction} className="mb-8 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold">Add a live channel</h2>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="e.g. RTM TV1 Live" required />
        </div>
        <div>
          <Label htmlFor="channelId">Channel</Label>
          <select id="channelId" name="channelId" required className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="embedUrl">Embed URL</Label>
          <Input id="embedUrl" name="embedUrl" type="url" placeholder="https://www.youtube.com/embed/..." required />
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            Use the rights holder&rsquo;s own official embed link — e.g. copy it from their verified YouTube channel.
          </p>
        </div>
        <div>
          <Label htmlFor="synopsis">Description (optional)</Label>
          <Textarea id="synopsis" name="synopsis" rows={2} />
        </div>
        <Button type="submit">Add live channel</Button>
      </form>

      <ul className="space-y-2">
        {liveStreams.map((l) => (
          <li key={l.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <Radio size={14} className={l.isLive ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]"} />
            <div className="min-w-0 flex-1">
              {l.videoAsset?.content ? (
                <Link href={`/watch/${l.videoAsset.content.slug}`} className="font-medium hover:text-[var(--color-accent)]">
                  {l.videoAsset.content.title}
                </Link>
              ) : (
                <span className="text-[var(--color-fg-muted)]">Unattached stream</span>
              )}
              <p className="text-xs text-[var(--color-fg-muted)]">{l.ingestType} — {l.isLive ? "Live now" : "Not live"}</p>
            </div>
            <form action={setLiveStatusAction.bind(null, l.id, !l.isLive)}>
              <Button type="submit" size="sm" variant={l.isLive ? "secondary" : "primary"}>
                {l.isLive ? "End stream" : "Go live"}
              </Button>
            </form>
          </li>
        ))}
        {liveStreams.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No live streams configured yet.</p>}
      </ul>
    </div>
  );
}

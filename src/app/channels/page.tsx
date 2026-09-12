import Link from "next/link";
import { listChannels } from "@/modules/channels/service";

export const metadata = { title: "Channels" };

export default async function ChannelsPage() {
  const channels = await listChannels();

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Channels</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {channels.map((channel) => (
          <Link key={channel.id} href={`/channels/${channel.slug}`} className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-bold">
              {channel.name.slice(0, 1).toUpperCase()}
            </div>
            <p className="truncate text-sm font-medium">{channel.name}</p>
            <p className="text-xs text-[var(--color-fg-muted)]">{channel._count.subscriptions} subscribers</p>
          </Link>
        ))}
        {channels.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No channels yet.</p>}
      </div>
    </div>
  );
}

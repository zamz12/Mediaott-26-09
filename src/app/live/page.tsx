import Link from "next/link";
import { Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PUBLIC_VISIBILITY_FILTER } from "@/modules/catalogue/visibility";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Live" };

export default async function LivePage() {
  const liveContent = await prisma.content.findMany({
    where: {
      contentType: "LIVE",
      status: "PUBLISHED",
      visibility: PUBLIC_VISIBILITY_FILTER,
      deletedAt: null,
    },
    orderBy: { publishedAt: "desc" },
    include: {
      channel: { select: { name: true, slug: true } },
      videoAssets: { select: { liveStream: { select: { isLive: true } } }, take: 1 },
    },
  });

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Live</h1>

      {liveContent.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center">
          <Radio className="text-[var(--color-fg-muted)]" size={28} />
          <h2 className="text-lg font-semibold">No live channels right now</h2>
          <p className="max-w-sm text-sm text-[var(--color-fg-muted)]">Check back later, or follow a channel to be notified when it goes live.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liveContent.map((item) => {
            const isLive = item.videoAssets[0]?.liveStream?.isLive ?? false;
            return (
              <Link
                key={item.id}
                href={`/watch/${item.slug}`}
                className="focus-ring interactive-glow group rounded-xl border border-[var(--color-border)] p-4 transition-transform duration-200 hover:scale-[1.02]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Badge tone={isLive ? "danger" : "default"}>
                    <Radio size={11} className="mr-1 inline" />
                    {isLive ? "LIVE" : "Offline"}
                  </Badge>
                  <span className="text-xs text-[var(--color-fg-muted)]">{item.channel.name}</span>
                </div>
                <h2 className="font-semibold group-hover:text-[var(--color-accent)]">{item.title}</h2>
                {item.synopsis && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-fg-muted)]">{item.synopsis}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

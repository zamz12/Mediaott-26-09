import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VideoCard } from "@/components/video/video-card";
import { NoSearchResults } from "@/components/empty-states";
import { getSearchProvider } from "@/lib/providers";
import { prisma } from "@/lib/prisma";
import { resolveCardMedia } from "@/modules/media/preview";
import { getSessionUser } from "@/lib/session";
import { logAnalyticsEvent } from "@/modules/analytics/service";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let cards: { slug: string; title: string; posterUrl: string | null; previewUrl: string | null }[] = [];

  if (query.length > 0) {
    const user = await getSessionUser();
    const results = await getSearchProvider().search({ text: query });
    void logAnalyticsEvent({ eventType: "SEARCH", userId: user?.id, metadata: { query } });

    const contents = await prisma.content.findMany({
      where: { id: { in: results.map((r) => r.contentId) } },
      include: { videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 } },
    });
    const byId = new Map(contents.map((c) => [c.id, c]));

    cards = await Promise.all(
      results.map(async (r) => {
        const content = byId.get(r.contentId);
        const media = content ? await resolveCardMedia(content) : { previewUrl: null, thumbnailUrl: null };
        return { slug: r.slug, title: r.title, posterUrl: r.posterUrl ?? media.thumbnailUrl, previewUrl: media.previewUrl };
      }),
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <form className="relative mx-auto mb-8 max-w-xl">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)]" />
        <Input name="q" defaultValue={query} placeholder="Search titles, creators, genres…" className="pl-11" autoFocus />
      </form>

      {query.length === 0 ? null : cards.length === 0 ? (
        <NoSearchResults query={query} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {cards.map((card) => (
            <VideoCard key={card.slug} data={card} />
          ))}
        </div>
      )}
    </div>
  );
}

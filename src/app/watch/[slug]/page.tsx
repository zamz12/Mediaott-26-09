import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getPlaybackPayload, PlaybackForbiddenError } from "@/modules/streaming/service";
import { Player } from "@/components/video/player";
import { VideoUnavailable } from "@/components/empty-states";
import { prisma } from "@/lib/prisma";
import { logAnalyticsEvent } from "@/modules/analytics/service";

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();

  let payload;
  try {
    payload = await getPlaybackPayload(user, slug);
  } catch (err) {
    if (err instanceof PlaybackForbiddenError) {
      return (
        <div>
          <VideoUnavailable />
          <p className="text-center text-sm text-[var(--color-fg-muted)]">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  void logAnalyticsEvent({ eventType: "VIDEO_IMPRESSION", userId: user?.id, contentId: payload.contentId });

  const episode = await prisma.episode.findUnique({
    where: { contentId: payload.contentId },
    include: { season: { include: { episodes: { orderBy: { episodeNumber: "asc" }, include: { content: { select: { slug: true } } } } } } },
  });

  let nextEpisodeHref: string | null = null;
  let previousEpisodeHref: string | null = null;
  if (episode) {
    const idx = episode.season.episodes.findIndex((e) => e.id === episode.id);
    const next = episode.season.episodes[idx + 1];
    const prev = episode.season.episodes[idx - 1];
    if (next) nextEpisodeHref = `/watch/${next.content.slug}`;
    if (prev) previousEpisodeHref = `/watch/${prev.content.slug}`;
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <Player payload={payload} nextEpisodeHref={nextEpisodeHref} previousEpisodeHref={previousEpisodeHref} />
      <div className="px-6 py-4">
        <h1 className="text-xl font-bold">{payload.title}</h1>
        <Link href={`/title/${slug}`} className="text-sm text-[var(--color-accent)]">
          More info
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getPlaybackPayload, AgeVerificationRequiredError, PlaybackForbiddenError } from "@/modules/streaming/service";
import { Player } from "@/components/video/player";
import { VideoUnavailable } from "@/components/empty-states";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { logAnalyticsEvent } from "@/modules/analytics/service";

const AGE_GATE_COOKIE = "lokal_age_confirmed";

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, cookieStore] = await Promise.all([getSessionUser(), cookies()]);
  const ageConfirmed = cookieStore.get(AGE_GATE_COOKIE)?.value === "1";

  let payload;
  try {
    payload = await getPlaybackPayload(user, slug, { ageConfirmed });
  } catch (err) {
    if (err instanceof AgeVerificationRequiredError) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <ShieldAlert size={32} className="text-[var(--color-gold)]" />
          <h1 className="text-lg font-semibold">Viewer discretion advised</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            This title is restricted to viewers 18 years and older. By continuing, you confirm you meet this age requirement.
          </p>
          <form action="/api/age-gate" method="POST">
            <input type="hidden" name="redirectTo" value={`/watch/${slug}`} />
            <Button type="submit">I am 18 or older — Continue</Button>
          </form>
        </div>
      );
    }
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

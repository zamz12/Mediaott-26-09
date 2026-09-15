import { notFound } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { getSessionUser } from "@/lib/session";
import { getChannelBySlug, getSubscription, listChannelContent, listChannelSeries } from "@/modules/channels/service";
import { VideoCard } from "@/components/video/video-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveCardMedia } from "@/modules/media/preview";
import { subscribeAction, unsubscribeAction } from "./actions";

const TABS = ["home", "videos", "series", "live", "playlists", "about"] as const;

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as (typeof TABS)[number]) : "home";

  const [user, channel] = await Promise.all([getSessionUser(), getChannelBySlug(slug)]);
  if (!channel) notFound();

  const [content, series, subscription] = await Promise.all([
    listChannelContent(channel.id),
    listChannelSeries(channel.id),
    user ? getSubscription(user.id, channel.id) : Promise.resolve(null),
  ]);

  const cards = await Promise.all(
    content.map(async (item) => {
      const media = await resolveCardMedia(item);
      return { slug: item.slug, title: item.title, posterUrl: item.posterUrl ?? media.thumbnailUrl, previewUrl: media.previewUrl };
    }),
  );

  return (
    <div>
      <div className="h-40 w-full bg-gradient-to-br from-[var(--color-border)] to-[var(--color-bg-elevated)] md:h-56" style={channel.bannerUrl ? { backgroundImage: `url(${channel.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />

      <div className="mx-auto max-w-[1600px] px-6">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-bg-elevated)] text-3xl font-bold">
              {channel.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                {channel.name} {channel.isVerified && <Badge tone="accent">Verified</Badge>}
              </h1>
              <p className="text-sm text-[var(--color-fg-muted)]">{channel._count.subscriptions} subscribers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && channel.ownerUserId && channel.ownerUserId !== user.id && (
              <Button href={`/messages/${channel.ownerUserId}`} variant="ghost">
                Message
              </Button>
            )}
            {user ? (
              subscription ? (
                <form action={unsubscribeAction.bind(null, channel.id, slug)}>
                  <Button type="submit" variant="secondary">
                    Subscribed
                  </Button>
                </form>
              ) : (
                <form action={subscribeAction.bind(null, channel.id, slug, "ALL")}>
                  <Button type="submit">Subscribe</Button>
                </form>
              )
            ) : (
              <Button href="/login">Subscribe</Button>
            )}
          </div>
        </div>

        <nav className="mt-6 flex gap-1 border-b border-[var(--color-border)] text-sm">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/channels/${slug}?tab=${t}`}
              className={clsx("border-b-2 px-4 py-2 capitalize", tab === t ? "border-[var(--color-accent)] text-[var(--color-fg)]" : "border-transparent text-[var(--color-fg-muted)]")}
            >
              {t}
            </Link>
          ))}
        </nav>

        <div className="py-6">
          {(tab === "home" || tab === "videos") && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {cards.map((card) => (
                <VideoCard key={card.slug} data={card} />
              ))}
              {cards.length === 0 && <p className="col-span-full text-sm text-[var(--color-fg-muted)]">No videos published yet.</p>}
            </div>
          )}

          {tab === "series" && (
            <ul className="space-y-2">
              {series.map((s) => (
                <li key={s.id} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  {s.title} — {s.seasons.length} season(s)
                </li>
              ))}
              {series.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No series yet.</p>}
            </ul>
          )}

          {tab === "live" && <p className="text-sm text-[var(--color-fg-muted)]">No live streams right now.</p>}
          {tab === "playlists" && <p className="text-sm text-[var(--color-fg-muted)]">No public playlists yet.</p>}
          {tab === "about" && (
            <div className="max-w-xl text-sm text-[var(--color-fg-muted)]">
              <p>{channel.description ?? "This channel hasn't added a description yet."}</p>
              {channel.organisation && <p className="mt-2">Operated by {channel.organisation.name}.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { Play, Plus, Check, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getContentBySlug, type ContentCard } from "@/modules/catalogue/service";
import { getReactionCounts, listComments } from "@/modules/moderation/service";
import { isInWatchlist } from "@/modules/library/service";
import { getContentViewCount } from "@/modules/analytics/service";
import { isPublicVisibility, PUBLIC_VISIBILITY_FILTER } from "@/modules/catalogue/visibility";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentRail } from "@/components/rails/content-rail";
import { toggleReactionAction, toggleWatchlistAction, submitReportAction, postCommentAction } from "./actions";

const RATING_LABEL: Record<string, string> = { U: "U", P13: "P13", SIXTEEN: "16", EIGHTEEN: "18" };

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}
const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "COPYRIGHT", label: "Copyright" },
  { value: "VIOLENCE", label: "Violence" },
  { value: "SEXUAL_CONTENT", label: "Sexual content" },
  { value: "HATE_ABUSE", label: "Hate / abuse" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "SPAM", label: "Spam" },
  { value: "PRIVACY", label: "Privacy" },
  { value: "ILLEGAL_CONTENT", label: "Illegal content" },
  { value: "OTHER", label: "Other" },
];

export default async function TitleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, content] = await Promise.all([getSessionUser(), getContentBySlug(slug)]);
  if (!content || content.status !== "PUBLISHED" || !isPublicVisibility(content.visibility)) notFound();

  const [reactions, comments, inWatchlist, viewCount, similar] = await Promise.all([
    getReactionCounts(content.id),
    listComments(content.id),
    user ? isInWatchlist(user.id, content.id) : Promise.resolve(false),
    getContentViewCount(content.id),
    prisma.content.findMany({
      where: {
        status: "PUBLISHED",
        visibility: PUBLIC_VISIBILITY_FILTER,
        id: { not: content.id },
        genres: { some: { genreId: { in: content.genres.map((g) => g.genreId) } } },
      },
      take: 12,
      include: {
        channel: { select: { name: true, slug: true } },
        originalLanguage: true,
        genres: { include: { genre: true } },
        videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 },
      },
    }) as Promise<ContentCard[]>,
  ]);

  const episodes = content.episode?.season.series.seasons.flatMap((s) => s.episodes) ?? [];

  return (
    <div>
      <div className="relative h-[40vh] min-h-[280px] w-full overflow-hidden md:h-[52vh]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.bannerUrl ?? content.posterUrl ?? "/placeholder-banner.svg"})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-16 pt-4">
        <h1 className="text-3xl font-extrabold">{content.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-muted)]">
          <Badge tone="gold">{RATING_LABEL[content.rating]}</Badge>
          {content.releaseYear && <span>{content.releaseYear}</span>}
          {content.countryCode && <span>{content.countryCode}</span>}
          {content.originalLanguage && <span>{content.originalLanguage.label}</span>}
          <span>{formatViewCount(viewCount)} views</span>
          {content.genres.map((g) => (
            <Badge key={g.genreId}>{g.genre.label}</Badge>
          ))}
          <Link href={`/channels/${content.channel.slug}`} className="text-[var(--color-accent)]">
            {content.channel.name}
          </Link>
        </div>

        {content.synopsis && <p className="mt-4 max-w-2xl text-sm text-[var(--color-fg-muted)]">{content.synopsis}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button href={`/watch/${content.slug}`} size="lg">
            <Play size={18} fill="currentColor" /> Play
          </Button>

          {user ? (
            <form action={toggleWatchlistAction.bind(null, content.id, content.slug)}>
              <Button type="submit" variant="secondary" size="lg">
                {inWatchlist ? <Check size={18} /> : <Plus size={18} />} My List
              </Button>
            </form>
          ) : (
            <Button href="/login" variant="secondary" size="lg">
              <Plus size={18} /> My List
            </Button>
          )}

          {user ? (
            <>
              <form action={toggleReactionAction.bind(null, content.id, content.slug, "LIKE")}>
                <Button type="submit" variant="ghost" size="lg" aria-label="Like">
                  <ThumbsUp size={18} /> {reactions.likes}
                </Button>
              </form>
              <form action={toggleReactionAction.bind(null, content.id, content.slug, "DISLIKE")}>
                <Button type="submit" variant="ghost" size="lg" aria-label="Dislike">
                  <ThumbsDown size={18} /> {reactions.dislikes}
                </Button>
              </form>
            </>
          ) : (
            <span className="text-sm text-[var(--color-fg-muted)]">
              {reactions.likes} likes
            </span>
          )}

          {user && (
            <details className="relative">
              <summary className="focus-ring flex h-11 cursor-pointer list-none items-center gap-2 rounded-full px-4 text-sm text-[var(--color-fg-muted)] hover:bg-white/5">
                <Flag size={16} /> Report
              </summary>
              <form action={submitReportAction} className="absolute right-0 z-10 mt-2 w-64 space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-xl">
                <input type="hidden" name="contentId" value={content.id} />
                <select name="reason" required className="w-full rounded-lg border border-[var(--color-border)] bg-transparent p-2 text-sm">
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <textarea name="details" placeholder="Details (optional)" className="w-full rounded-lg border border-[var(--color-border)] bg-transparent p-2 text-sm" rows={2} />
                <Button type="submit" size="sm" className="w-full">
                  Submit report
                </Button>
              </form>
            </details>
          )}
        </div>

        {episodes.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Episodes</h2>
            <ul className="space-y-2">
              {episodes.map((ep) => (
                <li key={ep.id}>
                  <Link href={`/watch/${ep.content.slug}`} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 hover:border-[var(--color-accent)]">
                    <span>
                      Episode {ep.episodeNumber} — {ep.content.title}
                    </span>
                    <Play size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Comments</h2>
          {user && (
            <form action={postCommentAction} className="mb-4 flex gap-2">
              <input type="hidden" name="contentId" value={content.id} />
              <input type="hidden" name="slug" value={content.slug} />
              <input name="body" placeholder="Add a comment…" className="focus-ring flex-1 rounded-full border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm" />
              <Button type="submit" size="sm">
                Post
              </Button>
            </form>
          )}
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium">{c.user.displayName}</span>{" "}
                <span className="text-[var(--color-fg-muted)]">{c.body}</span>
              </li>
            ))}
            {comments.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No comments yet.</p>}
          </ul>
        </div>
      </div>

      {similar.length > 0 && <ContentRail title="Similar content" items={similar} />}
    </div>
  );
}

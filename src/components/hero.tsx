import { Play, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ContentCard } from "@/modules/catalogue/service";

const RATING_LABEL: Record<string, string> = { U: "U", P13: "P13", SIXTEEN: "16", EIGHTEEN: "18" };

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Cinematic hero banner (Section 6). Background image only in MVP — video
// preview attaches the same previewStorageKey used by hover-preview cards,
// muted and never autoplaying audio, falling back to artwork when absent.
export function Hero({ content }: { content: ContentCard }) {
  return (
    <section className="relative h-[62vh] min-h-[420px] w-full overflow-hidden md:h-[78vh]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${content.bannerUrl ?? content.posterUrl ?? "/placeholder-banner.svg"})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)]/80 via-transparent to-transparent" />

      <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end gap-4 px-6 pb-12 md:w-2/3 md:pb-20">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-muted)]">
          <Badge tone="gold">{RATING_LABEL[content.rating] ?? content.rating}</Badge>
          {content.releaseYear && <span>{content.releaseYear}</span>}
          {formatDuration(content.durationSeconds) && <span>{formatDuration(content.durationSeconds)}</span>}
          {content.originalLanguage && <span>{content.originalLanguage.label}</span>}
          {content.genres[0] && <span>{content.genres[0].genre.label}</span>}
        </div>

        <h1 className="text-3xl font-extrabold leading-tight drop-shadow-lg md:text-5xl">{content.title}</h1>
        {content.synopsis && <p className="max-w-xl text-sm text-[var(--color-fg-muted)] md:text-base">{content.synopsis}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button href={`/watch/${content.slug}`} size="lg">
            <Play size={18} fill="currentColor" /> Play
          </Button>
          <Button href={`/title/${content.slug}`} variant="secondary" size="lg">
            <Info size={18} /> More Info
          </Button>
          <Button variant="ghost" size="lg" aria-label="Add to My List">
            <Plus size={18} /> My List
          </Button>
        </div>
      </div>
    </section>
  );
}

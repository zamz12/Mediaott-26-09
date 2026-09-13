import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { VideoCard } from "@/components/video/video-card";
import { EmptyCatalogue } from "@/components/empty-states";
import { resolveCardMedia } from "@/modules/media/preview";
import { listCategories, listGenres, listLanguages } from "@/modules/catalogue/service";
import { PUBLIC_VISIBILITY_FILTER } from "@/modules/catalogue/visibility";
import { clsx } from "clsx";

export const metadata = { title: "Explore" };

const CONTENT_TYPE_LABELS: Record<string, string> = {
  MOVIE: "Film",
  DRAMA: "Drama",
  SERIES: "TV Series",
  EPISODE: "Episode",
  DOCUMENTARY: "Documentary",
  SHORT_FILM: "Short film",
  AI_PRODUCTION: "AI production",
  ANIMATION: "Animation",
  EDUCATION: "Education",
  NEWS: "News",
  EVENT: "Event",
  LIVE: "Live",
  PODCAST: "Podcast",
  MUSIC: "Music",
  COMMUNITY: "Community",
  GOVERNMENT: "Government",
  TOURISM: "Tourism",
  CULTURE: "Culture",
  PERSONAL: "Personal",
};

interface ExploreSearchParams {
  category?: string;
  genre?: string;
  language?: string;
  type?: string;
  year?: string;
  country?: string;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreSearchParams> }) {
  const params = await searchParams;
  const [categories, genres, languages] = await Promise.all([listCategories(), listGenres(), listLanguages()]);

  const publishedWhere = { status: "PUBLISHED" as const, visibility: PUBLIC_VISIBILITY_FILTER, deletedAt: null };
  const [years, countries] = await Promise.all([
    prisma.content.findMany({
      where: { ...publishedWhere, releaseYear: { not: null } },
      distinct: ["releaseYear"],
      select: { releaseYear: true },
      orderBy: { releaseYear: "desc" },
    }),
    prisma.content.findMany({
      where: { ...publishedWhere, countryCode: { not: null } },
      distinct: ["countryCode"],
      select: { countryCode: true },
      orderBy: { countryCode: "asc" },
    }),
  ]);

  const items = await prisma.content.findMany({
    where: {
      ...publishedWhere,
      ...(params.category ? { category: { key: params.category } } : {}),
      ...(params.genre ? { genres: { some: { genre: { key: params.genre } } } } : {}),
      ...(params.language ? { originalLanguage: { code: params.language } } : {}),
      ...(params.type && params.type in CONTENT_TYPE_LABELS ? { contentType: params.type as ContentType } : {}),
      ...(params.year ? { releaseYear: Number(params.year) } : {}),
      ...(params.country ? { countryCode: params.country } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 60,
    include: {
      originalLanguage: true,
      videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 },
    },
  });

  const cards = await Promise.all(
    items.map(async (item) => {
      const media = await resolveCardMedia(item);
      return {
        slug: item.slug,
        title: item.title,
        posterUrl: item.posterUrl ?? media.thumbnailUrl,
        previewUrl: media.previewUrl,
        languageLabel: item.originalLanguage?.label,
      };
    }),
  );

  function filterLink(key: "category" | "genre" | "language" | "type" | "year" | "country", value?: string) {
    const next = new URLSearchParams(params as Record<string, string>);
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    return `/explore${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-4 text-2xl font-bold">Explore</h1>

      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <FilterGroup label="Category" active={params.category}>
          <Link href={filterLink("category")} className={chip(!params.category)}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={filterLink("category", c.key)} className={chip(params.category === c.key)}>
              {c.label}
            </Link>
          ))}
        </FilterGroup>

        <FilterGroup label="Genre" active={params.genre}>
          <Link href={filterLink("genre")} className={chip(!params.genre)}>
            All
          </Link>
          {genres.map((g) => (
            <Link key={g.id} href={filterLink("genre", g.key)} className={chip(params.genre === g.key)}>
              {g.label}
            </Link>
          ))}
        </FilterGroup>

        <FilterGroup label="Language" active={params.language}>
          <Link href={filterLink("language")} className={chip(!params.language)}>
            All
          </Link>
          {languages.map((l) => (
            <Link key={l.id} href={filterLink("language", l.code)} className={chip(params.language === l.code)}>
              {l.label}
            </Link>
          ))}
        </FilterGroup>

        <FilterGroup label="Type" active={params.type}>
          <Link href={filterLink("type")} className={chip(!params.type)}>
            All
          </Link>
          {Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => (
            <Link key={key} href={filterLink("type", key)} className={chip(params.type === key)}>
              {label}
            </Link>
          ))}
        </FilterGroup>

        {years.length > 0 && (
          <FilterGroup label="Year" active={params.year}>
            <Link href={filterLink("year")} className={chip(!params.year)}>
              All
            </Link>
            {years.map((y) => (
              <Link key={y.releaseYear} href={filterLink("year", String(y.releaseYear))} className={chip(params.year === String(y.releaseYear))}>
                {y.releaseYear}
              </Link>
            ))}
          </FilterGroup>
        )}

        {countries.length > 0 && (
          <FilterGroup label="Country" active={params.country}>
            <Link href={filterLink("country")} className={chip(!params.country)}>
              All
            </Link>
            {countries.map((c) => (
              <Link key={c.countryCode} href={filterLink("country", c.countryCode!)} className={chip(params.country === c.countryCode)}>
                {c.countryCode}
              </Link>
            ))}
          </FilterGroup>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyCatalogue />
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

function FilterGroup({ label, children }: { label: string; active?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[var(--color-fg-muted)]">{label}:</span>
      {children}
    </div>
  );
}

function chip(active: boolean) {
  return clsx(
    "focus-ring rounded-full border px-3 py-1",
    active ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
  );
}

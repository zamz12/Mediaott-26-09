import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VideoCard } from "@/components/video/video-card";
import { EmptyCatalogue } from "@/components/empty-states";
import { resolveCardMedia } from "@/modules/media/preview";
import { listCategories, listGenres, listLanguages } from "@/modules/catalogue/service";
import { clsx } from "clsx";

export const metadata = { title: "Explore" };

interface ExploreSearchParams {
  category?: string;
  genre?: string;
  language?: string;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreSearchParams> }) {
  const params = await searchParams;
  const [categories, genres, languages] = await Promise.all([listCategories(), listGenres(), listLanguages()]);

  const items = await prisma.content.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      deletedAt: null,
      ...(params.category ? { category: { key: params.category } } : {}),
      ...(params.genre ? { genres: { some: { genre: { key: params.genre } } } } : {}),
      ...(params.language ? { originalLanguage: { code: params.language } } : {}),
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

  function filterLink(key: "category" | "genre" | "language", value?: string) {
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

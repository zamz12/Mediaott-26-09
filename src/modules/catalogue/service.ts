import { prisma } from "@/lib/prisma";
import type { Content, HomepageSection } from "@prisma/client";
import type { HomepageSectionFilter } from "@/modules/admin/homepage";
import { isPublicVisibility, PUBLIC_VISIBILITY_FILTER } from "@/modules/catalogue/visibility";

const PUBLIC_WHERE = { status: "PUBLISHED" as const, visibility: PUBLIC_VISIBILITY_FILTER, deletedAt: null };

const CARD_INCLUDE = {
  channel: { select: { name: true, slug: true } },
  originalLanguage: true,
  genres: { include: { genre: true } },
  videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 },
};

export type ContentCard = Content & {
  channel: { name: string; slug: string };
  originalLanguage: { code: string; label: string } | null;
  genres: { genre: { key: string; label: string } }[];
  videoAssets: { previewStorageKey: string | null; thumbnailStorageKey: string | null }[];
};

export interface HomepageSectionView {
  id: string;
  key: string;
  title: string;
  items: ContentCard[];
}

// RecommendationService abstraction (Section 21/36): today this is
// explainable rules over Prisma queries. Swapping in a real ML recommender
// later means implementing resolveSectionItems differently — callers
// (the homepage, "More like this") never change.
async function resolveSectionItems(section: HomepageSection, userId?: string): Promise<ContentCard[]> {
  const take = 20;

  switch (section.algorithm) {
    case "MANUAL": {
      const items = await prisma.homepageSectionItem.findMany({
        where: { sectionId: section.id },
        orderBy: { position: "asc" },
        include: { content: { include: CARD_INCLUDE } },
      });
      return items.map((i) => i.content).filter((c) => c.status === "PUBLISHED" && isPublicVisibility(c.visibility)) as ContentCard[];
    }

    case "NEWEST":
      return prisma.content.findMany({
        where: PUBLIC_WHERE,
        orderBy: { publishedAt: "desc" },
        take,
        include: CARD_INCLUDE,
      }) as Promise<ContentCard[]>;

    case "TRENDING": {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const grouped = await prisma.analyticsEvent.groupBy({
        by: ["contentId"],
        where: { eventType: "VIDEO_PLAY", occurredAt: { gte: since }, contentId: { not: null } },
        _count: { contentId: true },
        orderBy: { _count: { contentId: "desc" } },
        take,
      });
      const ids = grouped.map((g) => g.contentId!).filter(Boolean);
      if (ids.length === 0) {
        return prisma.content.findMany({ where: PUBLIC_WHERE, orderBy: { publishedAt: "desc" }, take, include: CARD_INCLUDE }) as Promise<ContentCard[]>;
      }
      const items = await prisma.content.findMany({ where: { id: { in: ids }, ...PUBLIC_WHERE }, include: CARD_INCLUDE });
      const order = new Map(ids.map((id, i) => [id, i]));
      return (items as ContentCard[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    case "CONTINUE_WATCHING": {
      if (!userId) return [];
      const progress = await prisma.watchProgress.findMany({
        where: { userId, completed: false, positionSeconds: { gt: 0 } },
        orderBy: { updatedAt: "desc" },
        take,
        include: { content: { include: CARD_INCLUDE } },
      });
      return progress.map((p) => p.content) as ContentCard[];
    }

    case "FOLLOWED_CHANNELS": {
      if (!userId) return [];
      const subs = await prisma.channelSubscription.findMany({ where: { userId }, select: { channelId: true } });
      const channelIds = subs.map((s) => s.channelId);
      if (channelIds.length === 0) return [];
      return prisma.content.findMany({
        where: { ...PUBLIC_WHERE, channelId: { in: channelIds } },
        orderBy: { publishedAt: "desc" },
        take,
        include: CARD_INCLUDE,
      }) as Promise<ContentCard[]>;
    }

    case "BY_CATEGORY": {
      const key = (section.filterJson as HomepageSectionFilter | null)?.categoryKey;
      if (!key) return [];
      return prisma.content.findMany({
        where: { ...PUBLIC_WHERE, category: { key } },
        orderBy: { publishedAt: "desc" },
        take,
        include: CARD_INCLUDE,
      }) as Promise<ContentCard[]>;
    }

    case "BY_GENRE": {
      const key = (section.filterJson as HomepageSectionFilter | null)?.genreKey;
      if (!key) return [];
      return prisma.content.findMany({
        where: { ...PUBLIC_WHERE, genres: { some: { genre: { key } } } },
        orderBy: { publishedAt: "desc" },
        take,
        include: CARD_INCLUDE,
      }) as Promise<ContentCard[]>;
    }

    case "LIVE_NOW":
      return prisma.content.findMany({
        where: { ...PUBLIC_WHERE, contentType: "LIVE", videoAssets: { some: { liveStream: { isLive: true } } } },
        take,
        include: CARD_INCLUDE,
      }) as Promise<ContentCard[]>;

    case "RECOMMENDED":
    default: {
      if (!userId) {
        return prisma.content.findMany({ where: PUBLIC_WHERE, orderBy: { publishedAt: "desc" }, take, include: CARD_INCLUDE }) as Promise<ContentCard[]>;
      }
      // "Because you watched..." — same category/genres as recently-watched content.
      const recent = await prisma.watchHistory.findFirst({
        where: { userId },
        orderBy: { watchedAt: "desc" },
        include: { content: { include: { genres: true } } },
      });
      const genreIds = recent?.content.genres.map((g) => g.genreId) ?? [];
      if (genreIds.length === 0) {
        return prisma.content.findMany({ where: PUBLIC_WHERE, orderBy: { publishedAt: "desc" }, take, include: CARD_INCLUDE }) as Promise<ContentCard[]>;
      }
      return prisma.content.findMany({
        where: { ...PUBLIC_WHERE, genres: { some: { genreId: { in: genreIds } } }, id: { not: recent?.contentId } },
        take,
        include: CARD_INCLUDE,
      }) as Promise<ContentCard[]>;
    }
  }
}

export async function getHomepageSections(userId?: string): Promise<HomepageSectionView[]> {
  const now = new Date();
  const sections = await prisma.homepageSection.findMany({
    where: {
      isVisible: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });

  const views = await Promise.all(
    sections.map(async (section) => ({
      id: section.id,
      key: section.key,
      title: section.title,
      items: await resolveSectionItems(section, userId),
    })),
  );

  return views.filter((v) => v.items.length > 0);
}

export async function getHeroContent(): Promise<ContentCard | null> {
  const heroSection = await prisma.homepageSection.findUnique({
    where: { key: "hero" },
    include: { items: { orderBy: { position: "asc" }, take: 1, include: { content: { include: CARD_INCLUDE } } } },
  });
  if (heroSection?.items[0]) return heroSection.items[0].content as ContentCard;

  return prisma.content.findFirst({ where: PUBLIC_WHERE, orderBy: { publishedAt: "desc" }, include: CARD_INCLUDE }) as Promise<ContentCard | null>;
}

export async function getActiveTicker() {
  const now = new Date();
  return prisma.ticker.findMany({
    where: {
      isEnabled: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { priority: "desc" },
    include: { destinationContent: { select: { slug: true, title: true } } },
  });
}

export async function getContentBySlug(slug: string) {
  return prisma.content.findFirst({
    where: { slug, deletedAt: null },
    include: {
      channel: true,
      category: true,
      originalLanguage: true,
      genres: { include: { genre: true } },
      videoAssets: { include: { subtitles: { include: { language: true } }, audioTracks: { include: { language: true } }, renditions: true } },
      episode: { include: { season: { include: { series: { include: { seasons: { include: { episodes: { include: { content: true } } } } } } } } } },
    },
  });
}

export async function listCategories() {
  return prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function listGenres() {
  return prisma.genre.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function listLanguages() {
  return prisma.language.findMany({ where: { isActive: true } });
}

export async function listByCategory(categoryKey: string) {
  return prisma.content.findMany({
    where: { ...PUBLIC_WHERE, category: { key: categoryKey } },
    orderBy: { publishedAt: "desc" },
    include: CARD_INCLUDE,
  }) as Promise<ContentCard[]>;
}

import { prisma } from "@/lib/prisma";
import { PUBLIC_VISIBILITY_FILTER } from "@/modules/catalogue/visibility";
import type { SearchProvider, SearchQuery, SearchResultItem } from "./search.provider";

// MVP search: PostgreSQL ILIKE across title/synopsis/channel/genre metadata.
// Deliberately behind the SearchProvider interface so an OpenSearch/semantic
// implementation can replace this later without touching callers (Section 20/36).
export class PostgresSearchProvider implements SearchProvider {
  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const results = await prisma.content.findMany({
      where: {
        status: "PUBLISHED",
        visibility: PUBLIC_VISIBILITY_FILTER,
        deletedAt: null,
        AND: [
          {
            OR: [
              { title: { contains: query.text, mode: "insensitive" } },
              { synopsis: { contains: query.text, mode: "insensitive" } },
              { channel: { name: { contains: query.text, mode: "insensitive" } } },
              { genres: { some: { genre: { label: { contains: query.text, mode: "insensitive" } } } } },
            ],
          },
          query.categoryKey ? { category: { key: query.categoryKey } } : {},
          query.genreKey ? { genres: { some: { genre: { key: query.genreKey } } } } : {},
          query.languageCode ? { originalLanguage: { code: query.languageCode } } : {},
        ],
      },
      take: query.limit ?? 24,
      orderBy: { publishedAt: "desc" },
    });

    return results.map((c, i) => ({
      contentId: c.id,
      title: c.title,
      slug: c.slug,
      posterUrl: c.posterUrl,
      rank: i,
    }));
  }
}

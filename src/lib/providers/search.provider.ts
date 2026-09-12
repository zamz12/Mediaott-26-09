export interface SearchQuery {
  text: string;
  type?: string;
  languageCode?: string;
  genreKey?: string;
  categoryKey?: string;
  limit?: number;
}

export interface SearchResultItem {
  contentId: string;
  title: string;
  slug: string;
  posterUrl: string | null;
  rank: number;
}

export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResultItem[]>;
}

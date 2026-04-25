export type SortField =
  | "tmdbScore"
  | "releaseDate"
  | "popularity"
  | "title"
  | "userRating"
  | "budget"
  | "revenue";

export type SortDirection = "asc" | "desc";

export type SortChip = {
  field: SortField;
  direction: SortDirection;
};

export type FilmSearchParams = {
  query?: string;
  genres?: number[];
  countries?: string[];
  minYear?: number;
  maxYear?: number;
  minTmdbScore?: number;
  maxTmdbScore?: number;
  minUserRating?: number;
  maxUserRating?: number;
  streamingPlatforms?: string[];
  streamingCountry?: string;
  sort?: SortChip[];
  page?: number;
  limit?: number;
};

export type SearchResult<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type StreamingPlatform = {
  id: string;
  name: string;
  logoUrl: string;
};

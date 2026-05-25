const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getToken(): string {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not set");
  return token;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TMDb API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  original_title: string;
}

interface DiscoverResponse {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

export function posterUrl(
  path: string | null,
  size: "w342" | "w500" | "w780" | "original" = "w500",
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export async function discoverPopularThisWeek(limit = 10): Promise<TmdbMovie[]> {
  // Discover sorted by popularity with a meaningful vote threshold to avoid
  // obscure/unreleased titles — approximates "trending this week" via discover.
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const data = await tmdbFetch<DiscoverResponse>("/discover/movie", {
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    page: "1",
    "vote_count.gte": "50",
    "primary_release_date.gte": thirtyDaysAgo.toISOString().slice(0, 10),
    "primary_release_date.lte": today.toISOString().slice(0, 10),
  });

  return data.results.slice(0, limit);
}

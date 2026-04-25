"use client";

import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import type { FilmSearchParams, SortChip } from "@movie-haven/types";

const parseSortChips = {
  parse: (value: string): SortChip[] => {
    try {
      return JSON.parse(decodeURIComponent(value)) as SortChip[];
    } catch {
      return [];
    }
  },
  serialize: (value: SortChip[]) => encodeURIComponent(JSON.stringify(value)),
};

export function useFilmFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      query: parseAsString,
      genres: parseAsArrayOf(parseAsInteger),
      countries: parseAsArrayOf(parseAsString),
      minYear: parseAsInteger,
      maxYear: parseAsInteger,
      minTmdbScore: parseAsFloat,
      maxTmdbScore: parseAsFloat,
      minUserRating: parseAsFloat,
      maxUserRating: parseAsFloat,
      streamingPlatforms: parseAsArrayOf(parseAsString),
      page: parseAsInteger.withDefault(1),
    },
    { history: "push" },
  );

  function setFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    void setFilters({ [key]: value, page: 1 });
  }

  function clearAll() {
    void setFilters({
      query: null,
      genres: null,
      countries: null,
      minYear: null,
      maxYear: null,
      minTmdbScore: null,
      maxTmdbScore: null,
      minUserRating: null,
      maxUserRating: null,
      streamingPlatforms: null,
      page: 1,
    });
  }

  const activeFilterCount = [
    filters.query,
    filters.genres?.length,
    filters.countries?.length,
    filters.minYear,
    filters.maxYear,
    filters.minTmdbScore,
    filters.maxTmdbScore,
    filters.streamingPlatforms?.length,
  ].filter(Boolean).length;

  const searchParams: FilmSearchParams = {
    query: filters.query ?? undefined,
    genres: filters.genres ?? undefined,
    countries: filters.countries ?? undefined,
    minYear: filters.minYear ?? undefined,
    maxYear: filters.maxYear ?? undefined,
    minTmdbScore: filters.minTmdbScore ?? undefined,
    maxTmdbScore: filters.maxTmdbScore ?? undefined,
    streamingPlatforms: filters.streamingPlatforms ?? undefined,
    page: filters.page,
  };

  return { filters, setFilter, clearAll, activeFilterCount, searchParams };
}

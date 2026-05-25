"use client";

import { X } from "lucide-react";
import { countryCodeToFlag } from "@/lib/utils";
import { useFilmFilters } from "@/hooks/use-film-filters";

const GENRE_NAMES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  IN: "India",
  HK: "Hong Kong",
  TW: "Taiwan",
  IR: "Iran",
  SE: "Sweden",
  DK: "Denmark",
  NO: "Norway",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  AU: "Australia",
  RU: "Russia",
  PL: "Poland",
};

export function ActiveFilterTags() {
  const { filters, setFilter } = useFilmFilters();

  const tags: { label: string; onRemove: () => void }[] = [];

  if (filters.query) {
    tags.push({ label: `"${filters.query}"`, onRemove: () => setFilter("query", null) });
  }

  filters.genres?.forEach(id => {
    tags.push({
      label: GENRE_NAMES[id] ?? `Genre ${id}`,
      onRemove: () => setFilter("genres", filters.genres?.filter(g => g !== id) ?? null),
    });
  });

  filters.countries?.forEach(code => {
    tags.push({
      label: `${countryCodeToFlag(code)} ${COUNTRY_NAMES[code] ?? code}`,
      onRemove: () => setFilter("countries", filters.countries?.filter(c => c !== code) ?? null),
    });
  });

  if (filters.minYear ?? filters.maxYear) {
    const min = filters.minYear ?? 1900;
    const max = filters.maxYear ?? new Date().getFullYear();
    tags.push({
      label: `${min}–${max}`,
      onRemove: () => {
        setFilter("minYear", null);
        setFilter("maxYear", null);
      },
    });
  }

  if (filters.minTmdbScore ?? filters.maxTmdbScore) {
    const min = filters.minTmdbScore ?? 0;
    const max = filters.maxTmdbScore ?? 10;
    tags.push({
      label: `TMDB ${min}–${max}`,
      onRemove: () => {
        setFilter("minTmdbScore", null);
        setFilter("maxTmdbScore", null);
      },
    });
  }

  filters.streamingPlatforms?.forEach(platform => {
    tags.push({
      label: platform,
      onRemove: () =>
        setFilter(
          "streamingPlatforms",
          filters.streamingPlatforms?.filter(p => p !== platform) ?? null,
        ),
    });
  });

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-foreground"
        >
          {tag.label}
          <button
            onClick={tag.onRemove}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

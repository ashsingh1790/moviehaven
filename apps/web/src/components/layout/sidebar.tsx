"use client";

import { CountryFilter } from "@/components/filters/country-filter";
import { GenreFilter } from "@/components/filters/faceted-filter";
import { RangeFilter } from "@/components/filters/range-filter";
import { StreamingFilter } from "@/components/filters/streaming-filter";
import { useFilmFilters } from "@/hooks/use-film-filters";
import { ScrollArea, Separator } from "@movie-haven/ui";

export function FilterSidebar() {
  const { filters, setFilter, clearAll } = useFilmFilters();

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-border">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-sm font-semibold">Filters</span>
        {Object.keys(filters).length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-4">
          <GenreFilter
            selected={filters.genres ?? []}
            onChange={genres => setFilter("genres", genres)}
          />

          <Separator className="my-3" />

          <CountryFilter
            selected={filters.countries ?? []}
            onChange={countries => setFilter("countries", countries)}
          />

          <Separator className="my-3" />

          <RangeFilter
            label="Release Year"
            min={1900}
            max={new Date().getFullYear()}
            value={[filters.minYear ?? 1900, filters.maxYear ?? new Date().getFullYear()]}
            onChange={([min, max]) => {
              setFilter("minYear", min === 1900 ? null : min);
              setFilter("maxYear", max === new Date().getFullYear() ? null : max);
            }}
          />

          <Separator className="my-3" />

          <RangeFilter
            label="TMDB Score"
            min={0}
            max={10}
            step={0.5}
            value={[filters.minTmdbScore ?? 0, filters.maxTmdbScore ?? 10]}
            onChange={([min, max]) => {
              setFilter("minTmdbScore", min === 0 ? null : min);
              setFilter("maxTmdbScore", max === 10 ? null : max);
            }}
          />

          <Separator className="my-3" />

          <StreamingFilter
            selected={filters.streamingPlatforms ?? []}
            onChange={platforms => setFilter("streamingPlatforms", platforms)}
          />
        </div>
      </ScrollArea>
    </aside>
  );
}

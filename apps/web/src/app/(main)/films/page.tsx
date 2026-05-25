"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { SortChip } from "@movie-haven/types";
import { trpc } from "@/lib/trpc/client";
import { FilmCard } from "@/components/film-card";
import { SortChips } from "@/components/filters/sort-chips";
import { ActiveFilterTags } from "@/components/filters/active-filter-tags";
import { FiltersDrawer } from "@/components/filters/filters-drawer";
import { useFilmFilters } from "@/hooks/use-film-filters";
import { cn } from "@movie-haven/ui";

function FilmGrid({ onOpenFilters }: { onOpenFilters: () => void }) {
  const { searchParams, filters, setFilter } = useFilmFilters();
  const [sort, setSort] = useState<SortChip[]>([]);

  const { data, isLoading, isFetching } = trpc.films.search.useQuery({
    ...searchParams,
    sort,
    limit: 24,
  });

  const activeFilterCount = [
    filters.genres?.length,
    filters.countries?.length,
    filters.streamingPlatforms?.length,
    filters.minYear || filters.maxYear ? 1 : 0,
    filters.minTmdbScore || filters.maxTmdbScore ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        {/* Search + filter button + count row */}
        <div className="flex items-center gap-3">
          {/* Filter button */}
          <button
            onClick={onOpenFilters}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              activeFilterCount > 0
                ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-background hover:bg-accent text-foreground",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={filters.query ?? ""}
              onChange={e => setFilter("query", e.target.value || null)}
              placeholder="Search films..."
              className="w-full rounded-md border border-border bg-input pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground transition-colors"
            />
          </div>

          {data && (
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {data.total.toLocaleString()} films
            </span>
          )}
        </div>

        {/* Sort chips */}
        <SortChips sort={sort} onChange={setSort} />

        {/* Active filter tags */}
        <ActiveFilterTags />
      </div>

      {/* Film grid */}
      {isLoading ? (
        <FilmGridSkeleton />
      ) : (
        <>
          <div
            className={cn(
              "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 transition-opacity",
              isFetching && "opacity-60",
            )}
          >
            {data?.items.map(film => (
              <FilmCard
                key={film.id}
                film={{
                  id: film.id,
                  tmdbId: film.tmdbId,
                  title: film.title,
                  posterPath: film.posterPath,
                  releaseYear: film.releaseYear,
                  tmdbScore: film.tmdbScore ?? 0,
                  originCountries: (film.originCountries as string[]) ?? [],
                  genres: (film.genres as { id: number; name: string }[]) ?? [],
                }}
              />
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              page={filters.page}
              totalPages={data.totalPages}
              onPageChange={p => setFilter("page", p)}
            />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}

function FilmGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-card border border-border overflow-hidden">
          <div className="aspect-[2/3] bg-muted animate-pulse" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 rounded bg-muted animate-pulse" />
            <div className="h-3 rounded bg-muted animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FilmsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <FiltersDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="p-4 lg:p-6">
        <FilmGrid onOpenFilters={() => setDrawerOpen(true)} />
      </div>
    </>
  );
}

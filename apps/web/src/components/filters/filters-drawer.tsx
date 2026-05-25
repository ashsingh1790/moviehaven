"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ScrollArea, Separator } from "@movie-haven/ui";
import { GenreFilter } from "@/components/filters/faceted-filter";
import { CountryFilter } from "@/components/filters/country-filter";
import { StreamingFilter } from "@/components/filters/streaming-filter";
import { RangeFilter } from "@/components/filters/range-filter";
import { useFilmFilters } from "@/hooks/use-film-filters";

interface FiltersDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function FiltersDrawer({ open, onClose }: FiltersDrawerProps) {
  const { filters, setFilter, clearAll } = useFilmFilters();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeCount = [
    filters.genres?.length,
    filters.countries?.length,
    filters.streamingPlatforms?.length,
    filters.minYear || filters.maxYear ? 1 : 0,
    filters.minTmdbScore || filters.maxTmdbScore ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={`fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col bg-background border-r border-border shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Filters</span>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-accent transition-colors"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Separator />

        {/* Filter panels */}
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
                setFilter("minYear", min === 1900 ? undefined : min);
                setFilter("maxYear", max === new Date().getFullYear() ? undefined : max);
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
                setFilter("minTmdbScore", min === 0 ? undefined : min);
                setFilter("maxTmdbScore", max === 10 ? undefined : max);
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
    </>
  );
}

"use client";

import type { SortChip, SortField } from "@movie-haven/types";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "tmdbScore", label: "TMDB Score" },
  { field: "releaseDate", label: "Release Date" },
  { field: "popularity", label: "Popularity" },
  { field: "title", label: "Title" },
  { field: "revenue", label: "Box Office" },
];

interface SortChipsProps {
  sort: SortChip[];
  onChange: (sort: SortChip[]) => void;
}

export function SortChips({ sort, onChange }: SortChipsProps) {
  const usedFields = new Set(sort.map(s => s.field));
  const available = SORT_OPTIONS.filter(o => !usedFields.has(o.field));

  function addSort(field: SortField) {
    if (sort.length >= 3) return;
    onChange([...sort, { field, direction: "desc" }]);
  }

  function toggleDirection(index: number) {
    const updated = sort.map((chip, i) =>
      i === index ? { ...chip, direction: chip.direction === "asc" ? "desc" : "asc" } : chip,
    ) as SortChip[];
    onChange(updated);
  }

  function removeSort(index: number) {
    onChange(sort.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium shrink-0">Sort by:</span>

      {sort.map((chip, index) => (
        <div
          key={`${chip.field}-${index}`}
          className="flex items-center gap-0.5 rounded-full border border-primary/40 bg-primary/10 pl-2.5 pr-1 py-1 text-xs font-medium text-primary"
        >
          <span className="mr-0.5">{index + 1}.</span>
          <span>{SORT_OPTIONS.find(o => o.field === chip.field)?.label}</span>
          <button
            onClick={() => toggleDirection(index)}
            className="ml-1 hover:text-primary/70 transition-colors"
            title={`Switch to ${chip.direction === "asc" ? "descending" : "ascending"}`}
          >
            {chip.direction === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={() => removeSort(index)}
            className="ml-0.5 hover:text-primary/70 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {sort.length < 3 && available.length > 0 && (
        <div className="relative group">
          <button className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <Plus className="h-3 w-3" />
            Add sort
          </button>
          <div className="absolute top-full left-0 z-10 mt-1 hidden group-focus-within:block group-hover:block min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-lg">
            {available.map(option => (
              <button
                key={option.field}
                onClick={() => addSort(option.field)}
                className="flex w-full items-center px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {sort.length === 0 && (
        <span className="text-xs text-muted-foreground italic">Popularity (default)</span>
      )}
    </div>
  );
}

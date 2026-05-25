"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@movie-haven/ui";

const GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

interface GenreFilterProps {
  selected: number[];
  onChange: (genres: number[]) => void;
}

export function GenreFilter({ selected, onChange }: GenreFilterProps) {
  const [expanded, setExpanded] = useState(true);

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter(g => g !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium hover:text-primary transition-colors"
      >
        <span>
          Genres {selected.length > 0 && <span className="text-primary">({selected.length})</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GENRES.map(genre => {
            const isSelected = selected.includes(genre.id);
            return (
              <button
                key={genre.id}
                onClick={() => toggle(genre.id)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {isSelected && <Check className="h-2.5 w-2.5" />}
                {genre.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

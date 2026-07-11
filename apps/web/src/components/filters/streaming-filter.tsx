"use client";

import { cn } from "@movie-haven/ui";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

const STREAMING_PLATFORMS = [
  { id: "netflix", name: "Netflix" },
  { id: "prime", name: "Prime Video" },
  { id: "disney", name: "Disney+" },
  { id: "apple", name: "Apple TV+" },
  { id: "hbo", name: "Max" },
  { id: "hulu", name: "Hulu" },
  { id: "paramount", name: "Paramount+" },
  { id: "peacock", name: "Peacock" },
  { id: "mubi", name: "MUBI" },
  { id: "criterion", name: "Criterion" },
];

interface StreamingFilterProps {
  selected: string[];
  onChange: (platforms: string[]) => void;
}

export function StreamingFilter({ selected, onChange }: StreamingFilterProps) {
  const [expanded, setExpanded] = useState(false);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(p => p !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium hover:text-primary transition-colors"
      >
        <span>
          Streaming{" "}
          {selected.length > 0 && <span className="text-primary">({selected.length})</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {STREAMING_PLATFORMS.map(platform => {
            const isSelected = selected.includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => toggle(platform.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span>{platform.name}</span>
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

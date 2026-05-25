"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Slider } from "@movie-haven/ui";
import { cn } from "@movie-haven/ui";

interface RangeFilterProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function RangeFilter({ label, min, max, step = 1, value, onChange }: RangeFilterProps) {
  const [expanded, setExpanded] = useState(true);

  const isDefault = value[0] === min && value[1] === max;

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium hover:text-primary transition-colors"
      >
        <span>
          {label}{" "}
          {!isDefault && (
            <span className="text-primary">
              ({value[0]}–{value[1]})
            </span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-3 px-1 space-y-3">
          <Slider
            min={min}
            max={max}
            step={step}
            value={value}
            onValueChange={v => onChange(v as [number, number])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{value[0]}</span>
            <span>{value[1]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@movie-haven/ui";
import { countryCodeToFlag } from "@/lib/utils";

const POPULAR_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "IR", name: "Iran" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "NO", name: "Norway" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "RU", name: "Russia" },
  { code: "PL", name: "Poland" },
  { code: "RO", name: "Romania" },
  { code: "TR", name: "Turkey" },
];

interface CountryFilterProps {
  selected: string[];
  onChange: (countries: string[]) => void;
}

export function CountryFilter({ selected, onChange }: CountryFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = POPULAR_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(code: string) {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium hover:text-primary transition-colors"
      >
        <span>
          Country of Origin{" "}
          {selected.length > 0 && <span className="text-primary">({selected.length})</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="w-full rounded-md border border-border bg-input pl-7 pr-3 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-1">
            {filtered.map((country) => {
              const isSelected = selected.includes(country.code);
              return (
                <button
                  key={country.code}
                  onClick={() => toggle(country.code)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors text-left border",
                    isSelected
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-transparent hover:border-border hover:bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{countryCodeToFlag(country.code)}</span>
                  <span className="truncate">{country.name}</span>
                  {isSelected && <Check className="h-2.5 w-2.5 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

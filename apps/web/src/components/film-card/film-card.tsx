import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { FilmCard as FilmCardType } from "@movie-haven/types";
import { countryCodeToFlag, formatScore, tmdbImageUrl } from "@/lib/utils";

interface FilmCardProps {
  film: FilmCardType;
}

export function FilmCard({ film }: FilmCardProps) {
  const posterUrl = tmdbImageUrl(film.posterPath, "w342");
  const primaryCountry = film.originCountries[0];
  const hasStreaming = (film.streamingPlatforms?.length ?? 0) > 0;

  return (
    <Link href={`/films/${film.id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg bg-card border border-border transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
        {/* Poster */}
        <div className="relative aspect-[2/3] bg-muted overflow-hidden">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={film.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No poster
            </div>
          )}

          {/* Streaming indicator */}
          {hasStreaming && (
            <div className="absolute top-2 right-2">
              <div className="h-2 w-2 rounded-full bg-streaming-dot shadow-sm shadow-streaming-dot/50" />
            </div>
          )}

          {/* Country flag */}
          {primaryCountry && (
            <div className="absolute top-2 left-2 text-base leading-none" title={primaryCountry}>
              {countryCodeToFlag(primaryCountry)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 space-y-1">
          <h3 className="text-sm font-medium leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {film.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{film.releaseYear ?? "—"}</span>

            <div className="flex items-center gap-2">
              {film.userRating != null && (
                <span className="flex items-center gap-0.5 text-gold font-semibold">
                  <Star className="h-3 w-3 fill-gold" />
                  {formatScore(film.userRating)}
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-muted-foreground/50 text-muted-foreground/50" />
                {formatScore(film.tmdbScore)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

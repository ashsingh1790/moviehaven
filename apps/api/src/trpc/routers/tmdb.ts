import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../init";
import { type TmdbMovie, discoverPopularThisWeek, posterUrl } from "../../lib/tmdb";

const CACHE_KEY = "tmdb:popular-movies";
const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours — weekly trending doesn't change minute to minute

export interface PopularMovie {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string;
  releaseYear: number | null;
  tmdbScore: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  originalLanguage: string;
}

function shape(movie: TmdbMovie): PopularMovie {
  return {
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    posterUrl: posterUrl(movie.poster_path, "w500"),
    backdropUrl: posterUrl(movie.backdrop_path, "w780"),
    releaseDate: movie.release_date,
    releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
    tmdbScore: Math.round(movie.vote_average * 10) / 10,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
    genreIds: movie.genre_ids,
    originalLanguage: movie.original_language,
  };
}

export const tmdbRouter = router({
  popularMovies: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(20).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<PopularMovie[]> => {
      const limit = input?.limit ?? 10;
      const cacheKey = `${CACHE_KEY}:${limit}`;

      const cached = await ctx.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as PopularMovie[];
      }

      let movies: TmdbMovie[];
      try {
        movies = await discoverPopularThisWeek(limit);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch from TMDb",
        });
      }

      const result = movies.map(shape);
      await ctx.redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);

      return result;
    }),
});

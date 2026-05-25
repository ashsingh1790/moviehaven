import { z } from "zod";
import { desc, asc, eq, and, gte, lte, ilike, sql } from "drizzle-orm";
import { films } from "@movie-haven/db";
import { publicProcedure, router } from "../init";

const filmSearchInput = z.object({
  query: z.string().optional(),
  genres: z.array(z.number()).optional(),
  countries: z.array(z.string()).optional(),
  minYear: z.number().optional(),
  maxYear: z.number().optional(),
  minTmdbScore: z.number().min(0).max(10).optional(),
  maxTmdbScore: z.number().min(0).max(10).optional(),
  sort: z
    .array(
      z.object({
        field: z.enum(["tmdbScore", "releaseDate", "popularity", "title", "budget", "revenue"]),
        direction: z.enum(["asc", "desc"]),
      }),
    )
    .max(3)
    .optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(24),
});

export const filmsRouter = router({
  search: publicProcedure.input(filmSearchInput).query(async ({ ctx, input }) => {
    const { page, limit, query, minYear, maxYear, minTmdbScore, maxTmdbScore, sort } = input;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query) {
      conditions.push(ilike(films.title, `%${query}%`));
    }
    if (minYear) {
      conditions.push(gte(films.releaseYear, minYear));
    }
    if (maxYear) {
      conditions.push(lte(films.releaseYear, maxYear));
    }
    if (minTmdbScore) {
      conditions.push(gte(films.tmdbScore, minTmdbScore));
    }
    if (maxTmdbScore) {
      conditions.push(lte(films.tmdbScore, maxTmdbScore));
    }

    const orderBy = sort?.length
      ? sort.map(s => {
          const col = films[s.field as keyof typeof films] as Parameters<typeof asc>[0];
          return s.direction === "asc" ? asc(col) : desc(col);
        })
      : [desc(films.popularity)];

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      ctx.db
        .select()
        .from(films)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      ctx.db.select({ count: sql<number>`count(*)::int` }).from(films).where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    };
  }),

  byId: publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const film = await ctx.db.query.films.findFirst({
      where: eq(films.id, input.id),
    });

    if (!film) {
      throw new Error("Film not found");
    }

    return film;
  }),

  byTmdbId: publicProcedure
    .input(z.object({ tmdbId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.films.findFirst({
        where: eq(films.tmdbId, input.tmdbId),
      });
    }),
});

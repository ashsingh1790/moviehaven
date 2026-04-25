import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { users, ratings } from "@movie-haven/db";
import { protectedProcedure, router } from "../init";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }),

  rateFilm: protectedProcedure
    .input(
      z.object({
        filmId: z.number(),
        score: z.number().min(0.5).max(10),
        review: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [rating] = await ctx.db
        .insert(ratings)
        .values({
          userId: ctx.userId,
          filmId: input.filmId,
          score: input.score,
          review: input.review,
        })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.filmId],
          set: { score: input.score, review: input.review, updatedAt: new Date() },
        })
        .returning();

      return rating;
    }),

  deleteRating: protectedProcedure
    .input(z.object({ filmId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(ratings)
        .where(and(eq(ratings.userId, ctx.userId), eq(ratings.filmId, input.filmId)));

      return { success: true };
    }),

  myRatings: protectedProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        ctx.db.query.ratings.findMany({
          where: eq(ratings.userId, ctx.userId),
          limit: input.limit,
          offset: (input.page - 1) * input.limit,
          orderBy: (r, { desc }) => [desc(r.updatedAt)],
        }),
        ctx.db.$count(ratings, eq(ratings.userId, ctx.userId)),
      ]);

      return {
        items,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
        hasNextPage: input.page * input.limit < total,
      };
    }),
});

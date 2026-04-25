import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { lists, listItems, users } from "@movie-haven/db";
import { protectedProcedure, router } from "../init";

export const listsRouter = router({
  myLists: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.clerkId, ctx.userId),
    });

    if (!user) return [];

    return ctx.db.query.lists.findMany({
      where: eq(lists.userId, user.id),
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.userId),
      });

      if (!user) throw new Error("User not found");

      const [list] = await ctx.db
        .insert(lists)
        .values({ userId: user.id, ...input })
        .returning();

      return list;
    }),

  addFilm: protectedProcedure
    .input(z.object({ listId: z.number(), filmId: z.number(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.userId),
      });

      if (!user) throw new Error("User not found");

      const list = await ctx.db.query.lists.findFirst({
        where: and(eq(lists.id, input.listId), eq(lists.userId, user.id)),
      });

      if (!list) throw new Error("List not found");

      const [item] = await ctx.db
        .insert(listItems)
        .values({ listId: input.listId, filmId: input.filmId, note: input.note })
        .onConflictDoNothing()
        .returning();

      return item;
    }),

  removeFilm: protectedProcedure
    .input(z.object({ listId: z.number(), filmId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.userId),
      });

      if (!user) throw new Error("User not found");

      await ctx.db
        .delete(listItems)
        .where(
          and(eq(listItems.listId, input.listId), eq(listItems.filmId, input.filmId)),
        );

      return { success: true };
    }),
});

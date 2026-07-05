import { films, listItems, lists, ratings, users } from "@movie-haven/db";
import { buildBundle, validateBundle } from "@movie-haven/okf";
import type { Concept } from "@movie-haven/okf";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "../init";

/** URL/path-safe slug, de-duplicated within a bundle directory. */
function makeSlugger() {
  const seen = new Set<string>();
  return (input: string): string => {
    const base =
      input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "untitled";
    let slug = base;
    let n = 2;
    while (seen.has(slug)) slug = `${base}-${n++}`;
    seen.add(slug);
    return slug;
  };
}

/** Count occurrences and return the top-N keys by frequency. */
function topBy(values: string[], n: number): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

export const exportRouter = router({
  /**
   * Serialize the authenticated user's library (ratings, lists, taste profile)
   * into an OKF v0.1 bundle. Returns a { path -> markdown } map validated for
   * conformance; the web client zips and downloads it.
   */
  myLibraryOkf: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: { id: true, email: true, username: true, displayName: true, createdAt: true },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    // Ratings joined with film metadata, newest first.
    const ratedRows = await ctx.db
      .select({ rating: ratings, film: films })
      .from(ratings)
      .innerJoin(films, eq(ratings.filmId, films.id))
      .where(eq(ratings.userId, ctx.userId))
      .orderBy(desc(ratings.score), desc(ratings.updatedAt));

    // Lists and their items (films) in display order.
    const userLists = await ctx.db.query.lists.findMany({ where: eq(lists.userId, ctx.userId) });
    const listIds = userLists.map(l => l.id);
    const itemRows = listIds.length
      ? await ctx.db
          .select({ item: listItems, film: films })
          .from(listItems)
          .innerJoin(films, eq(listItems.filmId, films.id))
          .where(inArray(listItems.listId, listIds))
          .orderBy(listItems.position)
      : [];

    const displayName = user.displayName ?? user.username ?? user.email;
    const now = new Date().toISOString();
    const concepts: Concept[] = [];

    // --- Rating concepts ------------------------------------------------------
    const ratingSlug = makeSlugger();
    const ratingPathByFilmId = new Map<number, string>();
    for (const { rating, film } of ratedRows) {
      const year = film.releaseYear ?? "—";
      const path = `ratings/${ratingSlug(`${film.title}-${film.releaseYear ?? ""}`)}.md`;
      ratingPathByFilmId.set(film.id, path);

      const directors = film.directors ?? [];
      const genres = film.genres ?? [];
      const facts: string[] = [
        `- **Your score:** ${rating.score}/10`,
        `- **Released:** ${year}`,
        `- **TMDB score:** ${film.tmdbScore}`,
      ];
      if (directors.length) facts.push(`- **Director(s):** ${directors.join(", ")}`);
      if (genres.length) facts.push(`- **Genres:** ${genres.map(g => g.name).join(", ")}`);

      concepts.push({
        path,
        frontmatter: {
          type: "Rating",
          title: `${film.title} (${year}) — ${rating.score}/10`,
          description: `${displayName}'s ${rating.score}/10 rating of ${film.title}.`,
          timestamp: rating.updatedAt.toISOString(),
        },
        body: [
          facts.join("\n"),
          ...(rating.review ? ["", "## Review", "", rating.review] : []),
        ].join("\n"),
      });
    }

    // --- List concepts --------------------------------------------------------
    const listSlug = makeSlugger();
    for (const list of userLists) {
      const entries = itemRows.filter(r => r.item.listId === list.id);
      const lines = entries.map(({ item, film }) => {
        const label = `${film.title}${film.releaseYear ? ` (${film.releaseYear})` : ""}`;
        const ratedPath = ratingPathByFilmId.get(film.id);
        const link = ratedPath ? `[${label}](/${ratedPath})` : label;
        return `- ${link}${item.note ? ` — ${item.note}` : ""}`;
      });

      concepts.push({
        path: `lists/${listSlug(list.name)}.md`,
        frontmatter: {
          type: list.isWatchlist ? "Watchlist" : "List",
          title: list.name,
          description:
            list.description ??
            `${list.isWatchlist ? "Watchlist" : "List"} with ${entries.length} film(s).`,
          timestamp: list.updatedAt.toISOString(),
        },
        body: entries.length ? lines.join("\n") : "_This list is empty._",
      });
    }

    // --- Taste profile --------------------------------------------------------
    const scores = ratedRows.map(r => r.rating.score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const topGenres = topBy(
      ratedRows.flatMap(r => (r.film.genres ?? []).map(g => g.name)),
      5,
    );
    const topDirectors = topBy(
      ratedRows.flatMap(r => r.film.directors ?? []),
      5,
    );
    const favourites = ratedRows.slice(0, 5).flatMap(({ rating, film }) => {
      const path = ratingPathByFilmId.get(film.id);
      return path ? [`- [${film.title}](/${path}) — ${rating.score}/10`] : [];
    });

    concepts.push({
      path: "profile.md",
      frontmatter: {
        type: "Taste Profile",
        title: `${displayName}'s taste profile`,
        description: `Aggregate taste summary across ${scores.length} rating(s) and ${userLists.length} list(s).`,
        timestamp: now,
      },
      body: [
        `Movie Haven library export for **${displayName}**.`,
        "",
        "## Stats",
        "",
        `- **Ratings:** ${scores.length}`,
        `- **Average score:** ${avg.toFixed(2)}/10`,
        `- **Lists:** ${userLists.length}`,
        ...(topGenres.length
          ? ["", "## Top genres", "", ...topGenres.map(g => `- ${g.name} (${g.count})`)]
          : []),
        ...(topDirectors.length
          ? [
              "",
              "## Most-rated directors",
              "",
              ...topDirectors.map(d => `- ${d.name} (${d.count})`),
            ]
          : []),
        ...(favourites.length ? ["", "## Highest rated", "", ...favourites] : []),
      ].join("\n"),
    });

    const bundleName = `Movie Haven Library — ${displayName}`;
    const files = buildBundle({ name: bundleName, concepts });

    const result = validateBundle(files);
    if (!result.conformant) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Generated OKF bundle failed conformance validation.",
      });
    }

    return { bundleName, files };
  }),
});

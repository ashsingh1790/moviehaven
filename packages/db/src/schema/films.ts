import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const films = pgTable(
  "films",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull().unique(),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull(),
    overview: text("overview"),
    tagline: text("tagline"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: text("release_date"),
    releaseYear: integer("release_year"),
    runtime: integer("runtime"),
    budget: integer("budget").default(0),
    revenue: integer("revenue").default(0),
    status: text("status").default("Released"),
    tmdbScore: real("tmdb_score").default(0),
    tmdbVoteCount: integer("tmdb_vote_count").default(0),
    popularity: real("popularity").default(0),
    adult: boolean("adult").default(false),
    genres: jsonb("genres")
      .$type<{ id: number; name: string }[]>()
      .default([]),
    originCountries: jsonb("origin_countries").$type<string[]>().default([]),
    spokenLanguages: jsonb("spoken_languages")
      .$type<{ iso_639_1: string; name: string }[]>()
      .default([]),
    directors: jsonb("directors").$type<string[]>().default([]),
    cast: jsonb("cast").$type<string[]>().default([]),
    embeddingUpdatedAt: timestamp("embedding_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("films_tmdb_id_idx").on(table.tmdbId),
    index("films_release_year_idx").on(table.releaseYear),
    index("films_tmdb_score_idx").on(table.tmdbScore),
    index("films_popularity_idx").on(table.popularity),
  ],
);

export type Film = typeof films.$inferSelect;
export type NewFilm = typeof films.$inferInsert;

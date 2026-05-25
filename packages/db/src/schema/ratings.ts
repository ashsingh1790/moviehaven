import {
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { films } from "./films";
import { users } from "./users";

export const ratings = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filmId: integer("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    review: text("review"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    unique("ratings_user_film_unique").on(table.userId, table.filmId),
    index("ratings_user_id_idx").on(table.userId),
    index("ratings_film_id_idx").on(table.filmId),
  ],
);

export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;

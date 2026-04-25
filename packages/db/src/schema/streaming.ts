import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { films } from "./films";

export const streamingAvailability = pgTable(
  "streaming_availability",
  {
    id: serial("id").primaryKey(),
    filmId: integer("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    platform: text("platform").notNull(),
    streamType: text("stream_type").notNull().default("subscription"),
    link: text("link"),
    available: boolean("available").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("streaming_film_country_platform_unique").on(
      table.filmId,
      table.country,
      table.platform,
    ),
    index("streaming_film_id_idx").on(table.filmId),
    index("streaming_country_idx").on(table.country),
    index("streaming_platform_idx").on(table.platform),
  ],
);

export type StreamingAvailability = typeof streamingAvailability.$inferSelect;
export type NewStreamingAvailability = typeof streamingAvailability.$inferInsert;

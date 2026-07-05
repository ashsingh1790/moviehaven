---
type: "DB Table"
title: "ratings table"
description: "A user's 0.5–10 score for a film, with an optional embedded review. One row per (user, film)."
timestamp: 2026-07-05T20:42:47.881Z
---

A user's rating of a film on a 0.5–10 scale. Reviews are NOT a separate table — the optional `review` text column lives here.

# Schema

Postgres table `ratings` (Drizzle ORM, `@movie-haven/db`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial | no | primary key, auto default |
| `user_id` | uuid | no | — |
| `film_id` | integer | no | — |
| `score` | real | no | — |
| `review` | text | yes | — |
| `created_at` | timestamp with time zone | no | auto default |
| `updated_at` | timestamp with time zone | no | auto default |

# Foreign keys

- `user_id` → [users](/schema/users.md).`id` (on delete cascade)
- `film_id` → [films](/schema/films.md).`id` (on delete cascade)

# Unique constraints

- `user_id`, `film_id`

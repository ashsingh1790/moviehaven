---
type: "DB Table"
title: "list_items table"
description: "Join rows placing a film into a list, with ordering and an optional note."
timestamp: 2026-07-05T20:42:47.881Z
---

A film's membership in a list, with a `position` for ordering and an optional `note`. One row per (list, film).

# Schema

Postgres table `list_items` (Drizzle ORM, `@movie-haven/db`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial | no | primary key, auto default |
| `list_id` | integer | no | — |
| `film_id` | integer | no | — |
| `position` | integer | no | default `0` |
| `note` | text | yes | — |
| `added_at` | timestamp with time zone | no | auto default |

# Foreign keys

- `list_id` → [lists](/schema/lists.md).`id` (on delete cascade)
- `film_id` → [films](/schema/films.md).`id` (on delete cascade)

# Unique constraints

- `list_id`, `film_id`

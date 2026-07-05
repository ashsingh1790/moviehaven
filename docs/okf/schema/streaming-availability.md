---
type: "DB Table"
title: "streaming_availability table"
description: "Cached per-country, per-platform streaming availability for a film (Phase 3+)."
timestamp: 2026-07-05T20:42:47.881Z
---

Where a film can be streamed, by country and platform. Cached from JustWatch/TMDB with a ~24h TTL. One row per (film, country, platform).

# Schema

Postgres table `streaming_availability` (Drizzle ORM, `@movie-haven/db`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial | no | primary key, auto default |
| `film_id` | integer | no | — |
| `country` | text | no | — |
| `platform` | text | no | — |
| `stream_type` | text | no | default `subscription` |
| `link` | text | yes | — |
| `available` | boolean | no | default `true` |
| `updated_at` | timestamp with time zone | no | auto default |

# Foreign keys

- `film_id` → [films](/schema/films.md).`id` (on delete cascade)

# Unique constraints

- `film_id`, `country`, `platform`

---
type: "DB Table"
title: "films table"
description: "TMDB-sourced film metadata; the catalog every rating, list item, and streaming row points at."
timestamp: 2026-07-05T20:42:47.881Z
---

Every film Movie Haven knows about, imported and enriched from TMDB. One row per film, keyed internally by `id` and externally by the unique `tmdb_id`.

# Schema

Postgres table `films` (Drizzle ORM, `@movie-haven/db`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial | no | primary key, auto default |
| `tmdb_id` | integer | no | unique |
| `title` | text | no | — |
| `original_title` | text | no | — |
| `overview` | text | yes | — |
| `tagline` | text | yes | — |
| `poster_path` | text | yes | — |
| `backdrop_path` | text | yes | — |
| `release_date` | text | yes | — |
| `release_year` | integer | yes | — |
| `runtime` | integer | yes | — |
| `budget` | integer | yes | default `0` |
| `revenue` | integer | yes | default `0` |
| `status` | text | yes | default `Released` |
| `tmdb_score` | real | yes | default `0` |
| `tmdb_vote_count` | integer | yes | default `0` |
| `popularity` | real | yes | default `0` |
| `adult` | boolean | yes | default `false` |
| `genres` | jsonb | yes | auto default |
| `origin_countries` | jsonb | yes | auto default |
| `spoken_languages` | jsonb | yes | auto default |
| `directors` | jsonb | yes | auto default |
| `cast` | jsonb | yes | auto default |
| `embedding_updated_at` | timestamp with time zone | yes | — |
| `created_at` | timestamp with time zone | no | auto default |
| `updated_at` | timestamp with time zone | no | auto default |

---
type: "DB Table"
title: "lists table"
description: "User-owned watchlists and custom lists; may be public or private."
timestamp: 2026-07-05T20:42:47.881Z
---

A user-owned list of films (e.g. a watchlist or a themed collection). `is_watchlist` marks the canonical watchlist; `is_public` gates sharing.

# Schema

Postgres table `lists` (Drizzle ORM, `@movie-haven/db`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial | no | primary key, auto default |
| `user_id` | uuid | no | — |
| `name` | text | no | — |
| `description` | text | yes | — |
| `is_watchlist` | boolean | no | default `false` |
| `is_public` | boolean | no | default `false` |
| `created_at` | timestamp with time zone | no | auto default |
| `updated_at` | timestamp with time zone | no | auto default |

# Foreign keys

- `user_id` → [users](/schema/users.md).`id` (on delete cascade)

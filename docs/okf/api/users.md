---
type: "API Surface"
title: "users router"
description: "Profile and rating management for the authenticated user."
resource: "apps/api/src/trpc/routers/users.ts"
timestamp: 2026-07-05T20:42:47.881Z
---

tRPC router mounted at `users` (`apps/api/src/trpc/routers/users.ts`). All procedures are protected.

- `me` (query) — profile of the current [user](/domain/user.md).
- `rateFilm` (mutation) — upsert a [rating](/domain/rating.md) (score 0.5–10, optional review ≤ 2000 chars).
- `deleteRating` (mutation) — remove a rating.
- `myRatings` (query) — the user's ratings, paginated.

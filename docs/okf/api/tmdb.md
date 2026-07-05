---
type: "API Surface"
title: "tmdb router"
description: "TMDB-backed public lists for the landing page, cached in Redis."
resource: "apps/api/src/trpc/routers/tmdb.ts"
timestamp: 2026-07-05T20:42:47.881Z
---

tRPC router mounted at `tmdb` (`apps/api/src/trpc/routers/tmdb.ts`). Proxies TMDB via `apps/api/src/lib/tmdb.ts` and caches in Redis.

- `popularMovies` (public query) — trending films for the landing carousels (6h cache).

Phase-1 stories add `nowPlayingMovies`, `topBoxOfficeMovies`, and `topRatedMovies` (24h cache) — see [phases](/product/phases.md).

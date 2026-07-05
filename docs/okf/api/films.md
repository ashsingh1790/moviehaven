---
type: "API Surface"
title: "films router"
description: "Search and lookup over the film catalog."
resource: "apps/api/src/trpc/routers/films.ts"
timestamp: 2026-07-05T20:42:47.881Z
---

tRPC router mounted at `films` (`apps/api/src/trpc/routers/films.ts`). Reads the [films](/schema/films.md) table.

- `search` (public query) — paginated `SearchResult<Film>` filtered by `FilmSearchParams` (query, genres, countries, year/score ranges, sort).
- `byId` / `byTmdbId` (public queries) — single [film](/domain/film.md) lookup.

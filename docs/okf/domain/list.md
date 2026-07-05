---
type: "Entity"
title: "List"
description: "A user-curated collection of films (watchlist or custom list)."
timestamp: 2026-07-05T20:42:47.881Z
---

A named collection of [films](/domain/film.md) owned by a user. Backed by [lists](/schema/lists.md) with membership rows in [list_items](/schema/list-items.md).

`isWatchlist` distinguishes the canonical watchlist from ad-hoc lists (e.g. "80s Sci-Fi"); `isPublic` controls shareability.

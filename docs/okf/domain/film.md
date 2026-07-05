---
type: "Entity"
title: "Film"
description: "The core domain object — a movie with TMDB metadata, cast, crew, and scores."
timestamp: 2026-07-05T20:42:47.881Z
---

The central Movie Haven entity, defined in `@movie-haven/types` (`Film`) and persisted by the [films](/schema/films.md) table.

A `Film` carries identity (`id`, `tmdbId`), descriptive metadata (`title`, `overview`, `tagline`, `runtime`, `releaseYear`), scoring (`tmdbScore`, `popularity`), and denormalized `genres`, `directors`, and `cast` arrays sourced from TMDB.

`FilmCard` is the trimmed projection used in browse/search grids — poster, title, year, score, genres, plus optional `userRating` and `streamingPlatforms`.

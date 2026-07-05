---
type: "Entity"
title: "Rating"
description: "A user's score for a film, optionally carrying review text."
timestamp: 2026-07-05T20:42:47.881Z
---

A user's opinion of a [film](/domain/film.md): a `score` from 0.5 to 10 plus an optional `review` string. Persisted by the [ratings](/schema/ratings.md) table, one per (user, film).

Ratings are the primary signal for the Phase-4 recommendation engine and are upserted via `users.rateFilm`.

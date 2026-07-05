---
type: "API Surface"
title: "export router"
description: "Serializes a user's library into a downloadable OKF bundle."
resource: "apps/api/src/trpc/routers/export.ts"
timestamp: 2026-07-05T20:42:47.881Z
---

tRPC router mounted at `export` (`apps/api/src/trpc/routers/export.ts`). Protected.

- `myLibraryOkf` (query) — builds an in-memory OKF bundle of the user's [ratings](/domain/rating.md), [lists](/domain/list.md), and an aggregate taste profile, validated before return. The web client zips and downloads it.

Uses the shared `@movie-haven/okf` emitter/validator — the same code that generates this catalog.

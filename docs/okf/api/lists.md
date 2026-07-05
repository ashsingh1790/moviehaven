---
type: "API Surface"
title: "lists router"
description: "CRUD for user lists and their films."
resource: "apps/api/src/trpc/routers/lists.ts"
timestamp: 2026-07-05T20:42:47.881Z
---

tRPC router mounted at `lists` (`apps/api/src/trpc/routers/lists.ts`). All procedures are protected and scoped to the owner.

- `myLists` (query) — the user's [lists](/domain/list.md).
- `create` (mutation) — new list (name, optional description, `isPublic`).
- `addFilm` / `removeFilm` (mutations) — manage [list items](/domain/list-item.md).

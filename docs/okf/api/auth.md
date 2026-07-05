---
type: "API Surface"
title: "auth router"
description: "Registration, login, and username helpers; issues JWTs."
resource: "apps/api/src/trpc/routers/auth.ts"
timestamp: 2026-07-05T20:42:47.881Z
---

tRPC router mounted at `auth` (`apps/api/src/trpc/routers/auth.ts`). Manages accounts on the [users](/schema/users.md) table.

- `register` (public mutation) — create a [user](/domain/user.md), hash password (bcrypt), return `{ user, token }`.
- `login` (public mutation) — verify credentials in constant time, return `{ user, token }`.
- `me` (protected query) — the authenticated user's profile.
- `checkUsername` / `generateUsername` / `suggestUsernames` (public queries) — username availability + generation.

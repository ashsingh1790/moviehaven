---
type: "Entity"
title: "User"
description: "A registered account that owns ratings and lists."
timestamp: 2026-07-05T20:42:47.881Z
---

A registered account, backed by the [users](/schema/users.md) table. Owns [ratings](/domain/rating.md) and [lists](/domain/list.md).

Authentication is custom JWT via `jose`; the token carries `userId` and `email`. See [auth router](/api/auth.md).

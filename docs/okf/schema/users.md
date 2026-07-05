---
type: "DB Table"
title: "users table"
description: "Registered accounts with custom JWT auth (email + bcrypt password hash, optional username)."
timestamp: 2026-07-05T20:42:47.881Z
---

A registered Movie Haven account. Auth is custom JWT (jose) — the `password_hash` is bcrypt; Clerk is not used despite being installed.

# Schema

Postgres table `users` (Drizzle ORM, `@movie-haven/db`).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | no | primary key, auto default |
| `email` | text | no | unique |
| `password_hash` | text | no | — |
| `username` | text | yes | unique |
| `display_name` | text | yes | — |
| `avatar_url` | text | yes | — |
| `created_at` | timestamp with time zone | no | auto default |
| `updated_at` | timestamp with time zone | no | auto default |

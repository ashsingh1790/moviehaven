# Movie Haven

An intelligent film discovery platform that helps users find movies they actually want to watch.

> **What is Movie Haven?** See [PRD.md](./PRD.md) for the full product vision and requirements.  
> **Architecture & Dev Setup?** See [CLAUDE.md](./CLAUDE.md) for architecture, commands, and dev guidelines.

---

## Quick Start

### Prerequisites
- Node 22+ (see `.nvmrc`)
- pnpm 9+
- Docker (for local Postgres + Redis)

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Fill in required values (DATABASE_URL, JWT_SECRET, TMDB_READ_ACCESS_TOKEN, etc.)

# Start local infrastructure (Postgres + Redis)
pnpm infra:up

# Run database migrations
pnpm db:push

# Start all apps in dev mode
pnpm dev
```

The web app will be at `http://localhost:3000`  
The API will be at `http://localhost:3001`

---

## Project Structure

This is a **pnpm + Turborepo monorepo** with two apps and four packages:

```
MovieHaven/
├── apps/
│   ├── api/                    # Fastify 5 HTTP server + tRPC
│   └── web/                    # Next.js 15 frontend
├── packages/
│   ├── db/                     # Drizzle ORM schema
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # Shared shadcn/ui components
│   └── config/                 # Shared tsconfig & ESLint presets
├── README.md                   # This file (dev setup)
├── PRD.md                      # Product requirements & vision
├── CLAUDE.md                   # Architecture & dev commands
└── pnpm-workspace.yaml         # Workspace config
```

---

## Key Commands

**See [CLAUDE.md](./CLAUDE.md) for the complete command reference.**

Common tasks:

```bash
# Development
pnpm dev                        # Start all apps
pnpm --filter @movie-haven/web dev    # Start just the web app
pnpm --filter @movie-haven/api dev    # Start just the API

# Database
pnpm db:push                    # Push schema changes
pnpm db:generate                # Generate migration
pnpm db:migrate                 # Apply migrations
pnpm db:studio                  # Open Drizzle Studio UI

# Quality
pnpm build                      # Build all apps
pnpm lint                       # Lint all code
pnpm type-check                 # Type check all code
pnpm format                     # Format code

# Infrastructure
pnpm infra:up                   # Start Postgres + Redis
pnpm infra:down                 # Stop infrastructure
pnpm infra:reset                # Wipe volumes (⚠️ destructive)

# OKF knowledge catalog (run after schema or router changes)
pnpm okf:build                  # Regenerate docs/okf/ from live schema + routers
pnpm okf:validate               # Validate docs/okf/ conformance (Python, independent check)
```

---

## Tech Stack

- **Frontend:** Next.js 15, React, TanStack Query, shadcn/ui
- **Backend:** Fastify 5, tRPC v11, Node.js
- **Database:** PostgreSQL + Drizzle ORM
- **Caching:** Redis
- **Auth:** Custom JWT (jose)
- **External APIs:** TMDB (film metadata), JustWatch (streaming availability)
- **Monorepo:** Turborepo + pnpm workspaces

---

## Apps & Packages Overview

### Apps

| App | Purpose | Port |
|---|---|---|
| `apps/api` | Fastify HTTP server + tRPC API | 3001 |
| `apps/web` | Next.js frontend with auth & film browser | 3000 |

### Packages

| Package | Purpose |
|---|---|
| `@movie-haven/db` | Drizzle ORM schema, migrations, database utilities |
| `@movie-haven/types` | Shared TypeScript types (Film, User, SearchParams, etc.) |
| `@movie-haven/ui` | Shared shadcn/ui components |
| `@movie-haven/config` | TypeScript config presets, ESLint config |

---

## Environment Setup

Copy `.env.example` files and fill in required values:

**`apps/api/.env`:**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/movie_haven
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
TMDB_READ_ACCESS_TOKEN=your_token_here
ALLOWED_ORIGINS=http://localhost:3000
```

**`apps/web/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=your_secret_key_here  # Must match apps/api/.env
```

> **Note:** `JWT_SECRET` must be identical in both files for auth to work.

---

## Documentation

- **[PRD.md](./PRD.md)** — Product vision, features, phases, and decisions
- **[CLAUDE.md](./CLAUDE.md)** — Architecture overview, dev commands, developer guidelines

---

## Troubleshooting

**Port already in use?**
```bash
# Change port in apps/web/package.json or apps/api/src/index.ts
# Or kill the process: lsof -i :3000
```

**Database connection failed?**
```bash
# Make sure Docker is running and Postgres is up
pnpm infra:up
# Check DATABASE_URL in apps/api/.env
```

**pnpm command not found?**
```bash
# Install pnpm globally or use node's corepack
npm install -g pnpm@latest
# Or: corepack enable pnpm
```

**Module not found errors?**
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Contributing

When working on a feature:
1. Read [PRD.md](./PRD.md) to understand the big picture
2. Check [CLAUDE.md](./CLAUDE.md) for architecture and conventions
3. Create a branch: `git checkout -b feature/description`
4. Test locally: `pnpm dev` + manual testing in browser
5. Commit and push to GitHub

---

**Owner:** Sanjeevani  
**Last Updated:** May 24, 2026

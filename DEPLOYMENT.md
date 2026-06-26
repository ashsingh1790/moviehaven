# Deployment — $0 Path

Deploy Movie Haven for **$0/month** using free tiers. This is the demo/portfolio
setup. See [PRD.md](./.claude/docs/PRD.md) §5 for the paid/scaling path.

| Component | Service | Tier |
|---|---|---|
| Web (`apps/web`) | Vercel | Hobby (free) |
| API (`apps/api`) | Render | Free web service |
| Postgres | Neon | Free |
| Redis | Upstash | Free |

> **One tradeoff at $0:** Render's free service sleeps after ~15 min idle, so the
> first request after a quiet period takes ~30–60s (cold start). Fine for a demo.

---

## Order matters

The API needs the web URL (for CORS) and the web needs the API URL. So:

1. Provision **Neon** + **Upstash** (get connection strings)
2. Deploy the **API** to Render (get its URL)
3. Deploy the **web** to Vercel (get its URL, pointing at the API)
4. Go back and set the API's `ALLOWED_ORIGINS` to the Vercel URL

---

## 0. Shared secret

Both apps must verify JWTs with the **same** `JWT_SECRET`. Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Use the **same value** in both Render and Vercel below.

---

## 1. Database — Neon (free)

1. Create a project at https://neon.tech
2. Copy the **pooled** connection string (it ends with `?sslmode=require`).
3. Push the schema from your machine (Neon has no migration runner):

   ```bash
   DATABASE_URL="postgres://...neon.../db?sslmode=require" pnpm db:push
   ```

   `postgres.js` reads `sslmode` from the URL, so no code change is needed.

## 2. Redis — Upstash (free)

1. Create a database at https://upstash.com
2. Copy the **`rediss://`** URL (TLS). `ioredis` enables TLS automatically for `rediss://`.

## 3. API — Render (free)

This repo ships a [`render.yaml`](./render.yaml) Blueprint.

1. At https://dashboard.render.com → **New → Blueprint**, connect
   `ashsingh1790/moviehaven`. Render reads `render.yaml` and creates
   `movie-haven-api`.
2. When prompted, fill the secret env vars:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled string (`...?sslmode=require`) |
   | `REDIS_URL` | Upstash `rediss://...` URL |
   | `JWT_SECRET` | the secret from step 0 |
   | `TMDB_READ_ACCESS_TOKEN` | TMDB v4 token |
   | `ALLOWED_ORIGINS` | placeholder for now, e.g. `http://localhost:3000` (update in step 5) |

3. Deploy. Confirm it's live: `https://movie-haven-api.onrender.com/health`
   should return `{"status":"ok",...}`. Copy this base URL.

> The API runs via `tsx src/index.ts` (not a compiled `dist/`) because the
> `@movie-haven/db` / `@movie-haven/types` workspace packages export raw
> TypeScript. Render binds the port it injects via `PORT`.

## 4. Web — Vercel (free)

Vercel is dashboard-driven for monorepos (no `vercel.json` needed):

1. At https://vercel.com → **Add New → Project**, import `ashsingh1790/moviehaven`.
2. Set **Root Directory** to `apps/web`. Vercel auto-detects pnpm + the workspace
   and installs from the repo root. Framework preset: **Next.js** (auto).
3. Environment Variables:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the Render URL from step 3 (no trailing slash) |
   | `JWT_SECRET` | the **same** secret from step 0 |

4. Deploy. Copy the resulting URL, e.g. `https://moviehaven.vercel.app`.

## 5. Close the CORS loop

Back in Render → `movie-haven-api` → Environment, set:

```
ALLOWED_ORIGINS=https://moviehaven.vercel.app
```

Save (Render redeploys). Auth/API calls from the web app will now pass CORS.

---

## Continuous deploys

Both platforms auto-deploy on push to `main`:
- Vercel rebuilds the web app.
- Render redeploys the API (Blueprint tracks the `main` branch).

## Smoke test

1. Open the Vercel URL → landing page loads.
2. Sign up → should redirect to `/films` (first API call may be slow if Render
   was asleep).
3. Reload `/films` → stays authenticated (JWT cookie + middleware working).

## Troubleshooting

- **401 on every protected call** → `JWT_SECRET` differs between Render and Vercel.
- **CORS error in browser console** → `ALLOWED_ORIGINS` doesn't exactly match the
  Vercel origin (scheme + host, no trailing slash).
- **API 500 on boot** → missing `TMDB_READ_ACCESS_TOKEN` (required at startup) or a
  `DATABASE_URL` without `?sslmode=require`.
- **First request very slow** → expected Render free-tier cold start.

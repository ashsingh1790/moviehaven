---
title: "GW-D1 Spike: OWASP Top 10 Frontend Threat Model"
issue: "#42"
status: decided
last_updated: 2026-07-11
---

# GW-D1 — OWASP Top 10 Frontend Threat Model

## Summary

Grounded in the actual `apps/web` code (not a generic OWASP checklist). Headline result: **no CSP or security headers exist today** (`next.config.ts` has none), the JWT session cookie is **intentionally non-`httpOnly`** so client JS can forward it as a Bearer header, and the sign-in `next` redirect param is **read and pushed to the router with zero validation**. Separately, while reading the API surface for the IDOR row, found that `lists.removeFilm` has no ownership check at all — any authenticated user can delete any other user's list items by guessing IDs. That's arguably the single worst finding in this spike even though it's backend code, because the FE "remove from list" button is the exploit's front door; flagging it here and cross-referencing GW-D3/GW-D4 (backend hardening).

On the positive side: cookies use `sameSite: "strict"`, `secure` in production, React's default JSX escaping means there is currently **zero XSS surface** in the app (no `dangerouslySetInnerHTML`, no `innerHTML`, no unsanitized `next/link`/`<a href>` built from user input), and dependency/secret scanning are already wired (`(.github/workflows/security.yml`: `pnpm audit --audit-level high` + gitleaks).

---

## 1. Threat Table

| # | Risk (OWASP 2021 / classic) | Where it applies in this app | Current state | Severity | Concrete mitigation |
|---|---|---|---|---|---|
| 1 | **A03:2021 – Injection / XSS** (stored, future review text) | `packages/db/src/schema/ratings.ts` already has a `review: text("review")` column; `apps/api/src/trpc/routers/users.ts` `rateFilm` mutation already accepts and stores a `review: z.string().max(2000).optional()` field **today** — ahead of the PRD's Phase 2 timeline. No frontend component renders it yet (`rg "review" apps/web/src` returns nothing) so there is currently no live XSS sink. | **Exposed (latent)** — the dangerous ingredient (unsanitized freeform user text) already exists in the DB; the safe half (a renderer) doesn't exist yet. Repo-wide `dangerouslySetInnerHTML` grep across `apps/web/src` returns zero hits — no XSS sink exists anywhere in the app today. | **High (latent) / None (current)** | When the review UI ships: render review text as plain React children (`{review.text}`), never `dangerouslySetInnerHTML`. If rich text/markdown is ever wanted, sanitize server-side or client-side with a strict allowlist (`rehype-sanitize`, DOMPurify) — never trust the raw string. Add a Biome/lint rule ban on `dangerouslySetInnerHTML` in `apps/web` (Biome's `security/noDangerouslySetInnerHtml` — verify it's in the ruleset) so a future PR can't silently introduce a sink. |
| 2 | **A01:2021 – Broken Access Control (CSRF)** | Cookie-authenticated mutations: `POST /api/auth/login`, `/register`, `/logout` (`apps/web/src/app/api/auth/*/route.ts`). | **Protected.** Cookie is set with `sameSite: "strict"` (`login/route.ts:16`, `register/route.ts:17`) — browsers will not attach `mh_session` on cross-site requests, full stop. Additionally, the actual API (port 3001) is authenticated via an explicit `Authorization: Bearer` header built from JS reading the cookie (`provider.tsx` `getSessionToken()`), not via ambient cookie transmission to a different origin — so even a same-site CSRF-style request against the tRPC backend would lack the header. `login`/`register` don't require an existing session (login-CSRF forcing a victim into an attacker account is low-impact here: no state to poison pre-auth). `logout` unconditionally clears the cookie without reading it, so a forced-logout CSRF is a denial-of-service nuisance at worst. | **Low / Protected** | No CSRF tokens needed given `SameSite=Strict` + header-based (not cookie-based) API auth. Do not weaken `sameSite` to `lax` or `none` without re-deriving this analysis. If a "remember me" or persistent-login feature ever needs cross-site redirects (e.g., OAuth callback per PRD Phase 2 social auth), re-audit at that time. |
| 3 | **A01:2021 – Broken Access Control (Open Redirect)** | `apps/web/src/app/(auth)/sign-in/page.tsx:48` — `const next = searchParams.get("next") ?? "/films"; router.push(next);`. The middleware itself only ever constructs safe internal values (`middleware.ts:27`, `encodeURIComponent(pathname)` where `pathname` comes from `req.nextUrl`), but a user (or a phishing link sent to a user) can manually hit `/sign-in?next=https://evil.example/phish` or `/sign-in?next=//evil.example` — nothing validates that `next` is a same-origin, single-slash relative path before it's handed to the router. | **Exposed** | Validate before navigating: only accept values matching `/^\/(?!\/)/` (starts with exactly one `/`, not `//`) and reject/replace with `/films` otherwise. Apply the same allowlist in the middleware's redirect construction for defense in depth (it's already safe today, but don't let that invariant silently rot). Add this as a named helper (e.g. `sanitizeNextParam()`) shared by both call sites so it can't drift. |
| 4 | **Clickjacking** | No route is currently exempted from framing — nothing sets `X-Frame-Options` or a CSP `frame-ancestors` directive anywhere (`next.config.ts` has no `headers()` at all; grep for `X-Frame-Options`/`frame-ancestors` across `apps` returns nothing). Sign-in/sign-up forms are the highest-value clickjacking target (an attacker iframes the real sign-in page over a fake "click here" overlay to harvest credentials or trick a logged-in user into an unintended action). | **Exposed** | Set `X-Frame-Options: DENY` (legacy fallback) and `Content-Security-Policy: frame-ancestors 'none'` (modern, takes precedence) globally via `next.config.ts` `headers()`. Movie Haven has no legitimate embedding use case, so a global deny is safe — no per-route carve-out needed. |
| 5 | **A02:2021 – Cryptographic/Sensitive Data Failures (JWT-in-cookie handling)** | `apps/web/src/app/api/auth/login/route.ts:14-20` and `register/route.ts:15-21` set the `mh_session` cookie with `httpOnly: false` **by explicit, commented design** ("client JS reads it for tRPC Authorization header" — `register/route.ts:16`). `sameSite: "strict"` ✅, `secure: process.env.NODE_ENV === "production"` ✅ (correctly off only for local http dev), `path: "/"`, `maxAge` = 30 days (`SESSION_EXPIRY_DAYS`). | **Partially exposed by design.** `sameSite: strict` + `secure` (prod) are both correctly set — that part is safe. But `httpOnly: false` means **any** future XSS (even a low-severity one, e.g. from a third-party script or a later-added rich-text renderer) can read `document.cookie` and exfiltrate the raw JWT for offline replay from an attacker-controlled device/IP — a materially worse outcome than an `httpOnly` cookie, where XSS can still ride the ambient session in-browser but cannot lift the token out of the browser. Today there is no known XSS sink (see row 1), so exploitability is currently theoretical, but the blast radius if one appears is amplified by this cookie flag. | **Medium** (defense-in-depth gap, not an active exploit path today) | Two real options, pick one and document the choice: **(a)** keep the current pattern (`httpOnly: false`) *only if* the team accepts the amplified-XSS-blast-radius tradeoff and compensates with a strict CSP (row 6) that makes injecting a script in the first place hard; **(b)** switch to `httpOnly: true` and move the API-auth mechanism off "JS reads cookie, sets Bearer header" to same-origin proxying (Next.js API routes/Route Handlers forward the httpOnly cookie server-side to the port-3001 API) or a Next.js middleware-injected header — more work, strictly safer. Given GW-D2 is about to add CSP anyway, (a) + CSP is the pragmatic near-term fix; flag (b) as a longer-term hardening candidate. |
| 6 | **A05:2021 – Security Misconfiguration (missing headers/CSP)** | `apps/web/next.config.ts` has no `headers()` key at all — confirmed by reading the file (only `images.remotePatterns` for `image.tmdb.org` and `transpilePackages`). No CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` anywhere in the repo. | **Exposed** | Full header set proposed in Section 2 — this is GW-D2's primary deliverable. |
| 7 | **A05/A09 – Sensitive Data Exposure via `NEXT_PUBLIC_*`** | Repo-wide grep for `NEXT_PUBLIC_` finds exactly one variable in use: `NEXT_PUBLIC_API_URL` (`apps/web/src/lib/trpc/server.ts:5`, `provider.tsx:46`, `sign-up/page.tsx:53/71/86`). Its value is just the public API base URL (`http://localhost:3001` in dev) — not a secret. `JWT_SECRET` is read only via `process.env.JWT_SECRET` (non-prefixed) in `middleware.ts:15` and `lib/auth.ts:13`, so it is never bundled into client JS by Next's `NEXT_PUBLIC_*` inlining mechanism. | **Protected** | No action needed today. Add a lint/CI grep (`rg "NEXT_PUBLIC_" apps/web/src` diffed against an allowlist) so a future PR can't accidentally prefix a real secret with `NEXT_PUBLIC_` and ship it into the client bundle. |
| 8 | **A01:2021 – Broken Access Control (IDOR)** | Backend, but the FE surface is direct: the "remove from list" UI action calls `listsRouter.removeFilm` (`apps/api/src/trpc/routers/lists.ts`). Reading the handler: `addFilm` correctly checks `and(eq(lists.id, input.listId), eq(lists.userId, ctx.userId))` before inserting — ownership-checked. **`removeFilm` does not** — it runs `delete(listItems).where(and(eq(listItems.listId, input.listId), eq(listItems.filmId, input.filmId)))` with no ownership check on `listId` at all. Any authenticated user can delete any other user's list items by supplying an arbitrary `listId`/`filmId` pair. `ratings.ts` equivalents (`rateFilm`, `deleteRating`) both correctly scope by `ctx.userId` — this is an isolated gap, not a systemic pattern. | **Exposed (backend bug, FE-triggerable)** | This is technically API-side hardening (belongs to GW-D3/GW-D4's backend audit), but it's severe enough and directly reachable from the FE "remove from list" button that it's called out here rather than left for a later spike to rediscover. Fix: add the same `and(eq(listItems.listId, input.listId), eq(lists.userId, ctx.userId))`-style join/ownership check `addFilm` already uses, before the delete. Should be treated as a priority item for GW-D4, not deferred. |
| 9 | **A06:2021 – Vulnerable/Outdated Components** | Dependency risk across `apps/web`'s npm tree. | **Protected (CI-gated).** `.github/workflows/security.yml` already runs `pnpm audit --audit-level high` on every PR/push to `main`, plus a `gitleaks` secret-scan job — both landed via #61-equivalent work already merged (confirmed by reading `security.yml`, not assumed). | **Low** | No new work for GW-D1. Keep the audit-level at `high` (not `critical`-only) and revisit if it becomes noisy. |
| 10 | **A04:2021 – Insecure Design (client-side-only route gating)** | `apps/web/src/middleware.ts` is the sole gate for protected routes; it correctly verifies the JWT signature via `jose.jwtVerify` (not just cookie presence) before allowing through (`middleware.ts:31`), and deletes the cookie + redirects on verify failure. This is server-controlled (Next.js Edge Middleware), not a client-side-only check, so it's a legitimate access-control boundary — not the "fake gate that a curious user bypasses via devtools" anti-pattern. | **Protected** | No action. Worth reconfirming that every genuinely protected tRPC procedure also independently re-checks the JWT server-side (`protectedProcedure` in `apps/api`) rather than trusting the Next.js edge check alone — this is already the case per the `users.ts`/`lists.ts` routers reviewed above (`ctx.userId` derived from a server-verified token, not passed as client input). |

---

## 2. Prioritized Mitigation List for GW-D2

**Where to set headers: `next.config.ts` `headers()`, not middleware.**
Rationale: `headers()` is declarative, applies to every response (including static assets, if scoped broadly) without per-request JS execution cost, and is the officially documented Next.js mechanism for this. Middleware (`middleware.ts`) is already doing auth-redirect work and matches a narrower path set (its `matcher` excludes many static-asset extensions) — piling security headers onto it would mean re-deriving a matcher that covers *every* response, duplicating what `headers()` already does for free. Reserve middleware for logic that needs to branch on request state (e.g., per-route CSP nonces), which isn't needed yet.

**Proposed headers (add to `nextConfig.headers()` in `apps/web/next.config.ts`):**

```ts
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Next.js dev mode and React refresh need 'unsafe-eval'; prod builds
            // need 'unsafe-inline' for the inline bootstrap script Next.js emits
            // unless nonces are wired up (bigger lift — start without nonces).
            `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
            "style-src 'self' 'unsafe-inline'", // Tailwind/shadcn inline styles
            "img-src 'self' data: https://image.tmdb.org", // matches remotePatterns in this file
            "font-src 'self' data:",
            "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"),
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ];
},
```

Notes for whoever implements GW-D2:
- **`script-src 'unsafe-inline'`** is a real compromise, not an oversight — Next.js's App Router injects inline bootstrap `<script>` tags that a strict CSP without nonces would block. Tightening this to nonce-based (`script-src 'self' 'nonce-{random}'`) is possible but requires wiring a per-request nonce through middleware into `<Script>`/`<style>` tags — treat as a fast-follow, not a GW-D2 blocker.
- **`img-src`** must include `https://image.tmdb.org` to match `next.config.ts`'s existing `images.remotePatterns` (verified — that's the only remote image host configured today). Any new poster/avatar host added to `remotePatterns` later must be added here too, or images will silently 404 under CSP even though `next/image` still resolves them.
- **`connect-src`** must include the API origin (`NEXT_PUBLIC_API_URL`) or every tRPC `fetch` call from the browser will be blocked by CSP — easy to miss in local testing since `'self'` + same-origin dev proxying can mask it.
- **HSTS `preload`**: only submit to the HSTS preload list once truly ready (irreversible-ish, affects all subdomains) — shipping the header without submitting to the list is safe and recommended now; treat `preload` submission as a separate, deliberate step at Phase 5 deploy time.
- **`next` param validation** (row 3): add a small shared helper, e.g. `apps/web/src/lib/safe-redirect.ts`:
  ```ts
  export function sanitizeNextParam(value: string | null): string {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/films";
    return value;
  }
  ```
  Use it in `sign-in/page.tsx`'s `handleSubmit` (replace the bare `searchParams.get("next") ?? "/films"`) and consider using it in `middleware.ts` too for defense in depth even though the middleware's own construction is already safe.
- **Review-text sanitization strategy** (row 1): when the Phase 2 reviews UI is built, the default (escape-by-default JSX: `<p>{review.text}</p>`) is sufficient and requires no library as long as the renderer never upgrades to `dangerouslySetInnerHTML` for "rich" formatting. If product wants bold/italic/links in reviews, the policy should be: accept a small, explicit markup subset (e.g., a restrictive Markdown-lite parsed server-side into a fixed set of safe elements) rather than free HTML, and run the parsed output through a sanitizer allowlist (`rehype-sanitize` or `isomorphic-dompurify`) before any `dangerouslySetInnerHTML` use — never trust the stored string directly no matter how it was authored.
- **IDOR fix** (row 8, `lists.removeFilm`): not a GW-D2 header concern, but flagging again here since it's the highest-severity concrete bug found in this spike — route to GW-D4 explicitly.

---

## 3. Security-Reviewer Checklist (for GW-B4 agent)

Run against every `apps/web` (and shared `packages/ui`) PR diff:

1. [ ] No new `dangerouslySetInnerHTML`, `innerHTML`, or `document.write` usage — if present, does it sanitize with an allowlist library, and is the input untrusted-user-controlled?
2. [ ] No new `eval`, `new Function(...)`, or dynamic `<script src=...>` construction from request/user data.
3. [ ] Any new redirect (`router.push`, `redirect()`, `NextResponse.redirect`) built from a query param, form field, or other user input — is the target validated as a same-origin relative path (see `sanitizeNextParam` pattern) before use?
4. [ ] Any new cookie `Set-Cookie` — does it set `sameSite`, and if it carries an auth/session token, is `httpOnly` the default choice unless there's a documented, deliberate reason it must be JS-readable (as with `mh_session` today)?
5. [ ] Any new `NEXT_PUBLIC_*` environment variable — confirm it is not a secret (API keys, JWT secrets, DB URLs must never get this prefix).
6. [ ] Any new protected tRPC mutation/query touching a row scoped to a user (`lists`, `ratings`, future `reviews`/`watchlists`) — does the handler filter by `ctx.userId` (or an equivalent ownership join) in *every* code path, not just the "create"/"add" path? (This is exactly how `lists.removeFilm` slipped through — `addFilm` had the check, `removeFilm` didn't.)
7. [ ] Any new iframe embed or third-party widget — does it respect the `frame-ancestors`/`X-Frame-Options` policy, and is the embedded origin allowlisted deliberately (not wildcarded)?
8. [ ] Any new external `<img>`, `<script>`, `<link>`, or `fetch` target — is the origin covered by the CSP directives (`img-src`, `script-src`, `connect-src`, etc.), and was the CSP updated in the same PR if a new origin was added?
9. [ ] Any new form submission — does it use the app's existing fetch-with-JSON pattern (not a plain HTML `<form action>` GET/POST that a CSRF-vulnerable flow could exploit), and does it stay consistent with `sameSite: strict` cookie assumptions?
10. [ ] Any new client-side-only authorization check (e.g., hiding a button based on `user` state) — is there a matching server-side (`protectedProcedure`/middleware) enforcement, not just UI hiding?
11. [ ] Any new dependency added — does `pnpm audit --audit-level high` still pass, and is the package from a maintained/reputable source (checked manually if audit is silent but the package is unfamiliar)?
12. [ ] Any new user-generated text field (review, bio, list description, display name) destined for rendering — confirm it's rendered as JSX text content, never concatenated into HTML strings or markdown-to-`dangerouslySetInnerHTML` pipelines without sanitization.
13. [ ] Any change to `middleware.ts`'s `PUBLIC_PATHS`/`matcher` — confirm no previously-protected route becomes accidentally public (or vice versa causing a public route to 401-loop).
14. [ ] Any change to `next.config.ts` `headers()` — confirm CSP/HSTS/frame directives aren't weakened (e.g., no accidental `'unsafe-inline'` added to `frame-ancestors`-adjacent policy, no header silently dropped) as part of an unrelated fix.

---

## Answers to the specific questions posed in the ticket

- **CSRF — do login/register/logout need CSRF tokens, or does `SameSite` suffice?** `SameSite=Strict` (already set) suffices. No CSRF tokens are needed given the current design: cookies never travel cross-site, and the real API server auth is header-based (JS explicitly reads the cookie and sets `Authorization: Bearer`), so there's no ambient-credential attack surface for CSRF to exploit even ignoring `SameSite`.
- **Open redirect on `next`** — genuinely unvalidated (`sign-in/page.tsx:48`). Needs the `sanitizeNextParam()` fix in Section 2.
- **JWT-in-cookie: `httpOnly`? `secure`? `sameSite`? Verified in code, not assumed.** `httpOnly: false` (intentional, both `login` and `register` routes), `secure: true` in production only (`NODE_ENV === "production"` check, correct for local http dev), `sameSite: "strict"` (correct). The `httpOnly: false` choice is the one flag that's a genuine tradeoff, not a bug — see row 5.
- **Are cookie attributes currently safe?** `secure` and `sameSite` are both correctly configured for this app's threat model. `httpOnly: false` is a deliberate, documented deviation from best practice that amplifies (but does not by itself create) XSS impact — see row 5 for the full analysis and options.

# Writing matchers

A matcher is a regex-based candidate finder. It flags files (or specific lines) that look like an entry point or known vuln shape, and the AI investigates each candidate during `process`. Matchers don't decide what's a vulnerability — they decide what's worth the AI's attention.

The default matcher set covers ~110 patterns across major frameworks (`docs/supported-tech.md` lists detections). You write custom matchers when:
- The codebase has framework-specific entry points the defaults miss (e.g. internal RPC over WebSockets).
- A vuln pattern keeps being missed in `process` because no candidate gets flagged on the relevant files.
- You need to flip on holistic AI review for a directory tree.

## File layout

```
.deepsec/
├── deepsec.config.ts
└── matchers/
    ├── my-route-no-auth.ts
    └── debug-flag.ts
```

Matchers live in `.deepsec/matchers/<slug>.ts` (kebab-case). Each exports a matcher object that gets wired into a plugin in `deepsec.config.ts`:

```ts
import { defineConfig, type DeepsecPlugin } from "deepsec/config";
import { myRouteNoAuth } from "./matchers/my-route-no-auth.js";
import { debugFlag } from "./matchers/debug-flag.js";

const myAppPlugin: DeepsecPlugin = {
  name: "my-app",
  matchers: [myRouteNoAuth, debugFlag],
};

export default defineConfig({
  projects: [{ id: "my-app", root: ".." }],
  plugins: [myAppPlugin],
});
```

## Matcher shape

The exact type is in `.deepsec/node_modules/deepsec/dist/config.d.ts` (`MatcherPlugin` interface). The convenience helper `regexMatcher(...)` is the right starting point. Read these files in `.deepsec/node_modules/deepsec/dist/samples/webapp/matchers/` for canonical examples:
- `webapp-debug-flag.ts` — a `precise` matcher
- `webapp-route-no-rate-limit.ts` — a `normal` matcher with a holistic message

And `.../samples/webapp/deepsec.config.ts` for the wiring.

## Noise tiers

Every matcher has a noise tier. Pick the right one — wrong tier is the most common matcher-author mistake:

| Tier | When | Behavior | Sweet-spot hits |
|---|---|---|---|
| `precise` | Pattern is unambiguous and rare (e.g. `DEBUG = true` in prod config). | Processed first; AI trusts the flag heavily. | 1–20 per 1k files |
| `normal` | Pattern signals "worth a look" but the AI must disambiguate (e.g. an HTTP route with no rate limiter). | Default. | 5–100 per 1k files |
| `noisy` | Pattern is "every entry point in this glob" — used to force holistic review of a directory. | Every match becomes a candidate. | ~entry-point count |

`noisy` matchers can wedge the scanner with broad globs. **Always anchor by directory or specific extension** — e.g. `pages/api/**/*.ts`, not `**/*.ts`.

## The recommended workflow

The README says the user should "prompt your coding agent to grow your matcher set". When you (the agent) are doing that, follow this sequence — it's also encoded in `docs/writing-matchers.md`:

1. **Get baseline data first.** Run `scan + process --limit 50 + revalidate --min-severity HIGH` so `data/<id>/files/` is populated. Without real candidates and findings, you're guessing about what's missing.

2. **Read the type and samples:**
   - `.deepsec/node_modules/deepsec/dist/config.d.ts` — `MatcherPlugin` interface and `regexMatcher` helper
   - `.deepsec/node_modules/deepsec/dist/samples/webapp/matchers/` — concrete examples
   - `.deepsec/node_modules/deepsec/dist/samples/webapp/deepsec.config.ts` — plugin wiring

3. **Survey existing coverage.** Walk `.deepsec/data/<id>/files/` and look at `candidates[]`. Files with zero candidates are blind spots; files with many are well-covered. Cross-reference against the actual repo structure.

4. **Identify entry points the parent repo has but defaults missed.** The deepsec docs call out:
   - `next.config.*` / `wrangler.toml` / `serverless.yml` / `Procfile`
   - `main.go`, `cmd/*.go`, `app.py`, `manage.py`
   - Custom RPC handlers, message queues, webhook receivers
   - Internal-only routes (admin panels, debug pages)
   - Anything where data crosses a trust boundary

5. **Write the matchers** — save under `.deepsec/matchers/<slug>.ts`, import types from `"deepsec/config"`. Use `regexMatcher` if the pattern is line-anchored; build the object manually for `noisy` glob-only matchers.

6. **Wire into the inline plugin** in `deepsec.config.ts` and validate:
   ```bash
   pnpm deepsec scan --matchers <slug1>,<slug2>
   ```
   The `--matchers` flag scopes the scan to just the new ones — fast feedback. Check the resulting `candidates[]` counts. If a `precise` matcher hits 200 files, retier to `normal`. If `normal` hits 0, the regex is too tight.

7. **Re-process the touched files** and see if findings improve:
   ```bash
   pnpm deepsec process --reinvestigate --files-from <(grep -rl <pattern> .)
   ```

## Slug collisions

If a custom matcher's slug matches a built-in's, the **plugin matcher wins**. This is intentional — it's how you override defaults. But it means a typo in a custom slug can silently disable a built-in. When introducing a new matcher, run with `--matchers` (your slug only) and confirm hit counts before merging.

## Anti-patterns

- **Catching too much.** A matcher that flags every TypeScript file makes `process` re-investigate the whole repo at AI cost. Use `noisy` deliberately, with tight globs.
- **Using line numbers in INFO.md to compensate** for a missing matcher. Line numbers rot; matchers don't.
- **Writing a matcher when INFO.md is the right tool.** Matchers add candidates; INFO.md tells the AI what to ignore. If the issue is "the AI keeps flagging X as a vuln when it isn't", that's an INFO.md problem.
- **Naming the slug after the codebase rather than the pattern.** Slugs should describe the *shape being detected*, e.g. `next-server-action-no-auth`, not `acme-app-auth`.

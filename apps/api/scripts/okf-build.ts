/**
 * okf-build — generates the Movie Haven developer knowledge catalog as an OKF
 * v0.1 bundle at docs/okf. Schema concepts are introspected from the live
 * Drizzle tables (so they never drift); domain/api/product concepts are curated
 * prose. Run with: `pnpm --filter @movie-haven/api okf:build`.
 *
 * The bundle is what Claude Code agents (and the future Phase-4 LLM layer) read
 * index-first for cheap, accurate context. See root CLAUDE.md → "OKF Knowledge
 * Catalog" for the navigation contract.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Importing @movie-haven/db pulls in the postgres client, which throws without a
// connection string. We only introspect table *shapes* here — never connect —
// so a placeholder is enough to get past module load.
process.env.DATABASE_URL ??= "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const { getTableName } = await import("drizzle-orm");
const { getTableConfig } = await import("drizzle-orm/pg-core");
const { films, users, ratings, lists, listItems, streamingAvailability } = await import(
  "@movie-haven/db"
);
const { buildBundle, validateBundle, formatValidation } = await import("@movie-haven/okf");
type Concept = import("@movie-haven/okf").Concept;

const NOW = new Date().toISOString();

// Map Postgres table name -> bundle concept path, for cross-linking FKs.
const TABLE_SLUGS: Record<string, string> = {
  films: "schema/films.md",
  users: "schema/users.md",
  ratings: "schema/ratings.md",
  lists: "schema/lists.md",
  list_items: "schema/list-items.md",
  streaming_availability: "schema/streaming-availability.md",
};

// biome-ignore lint/suspicious/noExplicitAny: Drizzle table types are heterogeneous here.
type AnyTable = any;

function primitive(value: unknown): string | null {
  if (typeof value === "string") return `\`${value}\``;
  if (typeof value === "number" || typeof value === "boolean") return `\`${String(value)}\``;
  return null;
}

/** Render a `# Schema` markdown table for one Drizzle table via introspection. */
function schemaBody(table: AnyTable, purpose: string): string {
  const cfg = getTableConfig(table);
  const tableName = getTableName(table);

  // Only single-column unique constraints make a column itself unique; columns
  // inside a composite unique are listed under "Unique constraints" instead.
  const uniqueColumns = new Set<string>();
  for (const uc of cfg.uniqueConstraints ?? []) {
    const only = uc.columns.length === 1 ? uc.columns[0] : undefined;
    if (only) uniqueColumns.add(only.name);
  }

  const rows = cfg.columns.map(col => {
    const notes: string[] = [];
    if (col.primary) notes.push("primary key");
    if (col.isUnique || uniqueColumns.has(col.name)) notes.push("unique");
    if (col.hasDefault) {
      const lit = primitive(col.default);
      notes.push(lit ? `default ${lit}` : "auto default");
    }
    const nullable = col.notNull ? "no" : "yes";
    return `| \`${col.name}\` | ${col.getSQLType()} | ${nullable} | ${notes.join(", ") || "—"} |`;
  });

  const fks = cfg.foreignKeys.map(fk => {
    const ref = fk.reference();
    const from = ref.columns[0]?.name ?? "?";
    const targetTable = getTableName(ref.foreignTable);
    const targetCol = ref.foreignColumns[0]?.name ?? "id";
    const slug = TABLE_SLUGS[targetTable];
    const target = slug ? `[${targetTable}](/${slug})` : targetTable;
    const onDelete = fk.onDelete ? ` (on delete ${fk.onDelete})` : "";
    return `- \`${from}\` → ${target}.\`${targetCol}\`${onDelete}`;
  });

  const compositeUniques = (cfg.uniqueConstraints ?? [])
    .filter(uc => uc.columns.length > 1)
    .map(uc => `- \`${uc.columns.map(c => c.name).join("`, `")}\``);

  return [
    purpose,
    "",
    "# Schema",
    "",
    `Postgres table \`${tableName}\` (Drizzle ORM, \`@movie-haven/db\`).`,
    "",
    "| Column | Type | Nullable | Notes |",
    "|--------|------|----------|-------|",
    ...rows,
    ...(fks.length ? ["", "# Foreign keys", "", ...fks] : []),
    ...(compositeUniques.length ? ["", "# Unique constraints", "", ...compositeUniques] : []),
  ].join("\n");
}

function schemaConcept(
  slug: string,
  title: string,
  description: string,
  table: AnyTable,
  purpose: string,
): Concept {
  return {
    path: `schema/${slug}.md`,
    frontmatter: { type: "DB Table", title, description, timestamp: NOW },
    body: schemaBody(table, purpose),
  };
}

const schemaConcepts: Concept[] = [
  schemaConcept(
    "films",
    "films table",
    "TMDB-sourced film metadata; the catalog every rating, list item, and streaming row points at.",
    films,
    "Every film Movie Haven knows about, imported and enriched from TMDB. One row per film, keyed internally by `id` and externally by the unique `tmdb_id`.",
  ),
  schemaConcept(
    "users",
    "users table",
    "Registered accounts with custom JWT auth (email + bcrypt password hash, optional username).",
    users,
    "A registered Movie Haven account. Auth is custom JWT (jose) — the `password_hash` is bcrypt; Clerk is not used despite being installed.",
  ),
  schemaConcept(
    "ratings",
    "ratings table",
    "A user's 0.5–10 score for a film, with an optional embedded review. One row per (user, film).",
    ratings,
    "A user's rating of a film on a 0.5–10 scale. Reviews are NOT a separate table — the optional `review` text column lives here.",
  ),
  schemaConcept(
    "lists",
    "lists table",
    "User-owned watchlists and custom lists; may be public or private.",
    lists,
    "A user-owned list of films (e.g. a watchlist or a themed collection). `is_watchlist` marks the canonical watchlist; `is_public` gates sharing.",
  ),
  schemaConcept(
    "list-items",
    "list_items table",
    "Join rows placing a film into a list, with ordering and an optional note.",
    listItems,
    "A film's membership in a list, with a `position` for ordering and an optional `note`. One row per (list, film).",
  ),
  schemaConcept(
    "streaming-availability",
    "streaming_availability table",
    "Cached per-country, per-platform streaming availability for a film (Phase 3+).",
    streamingAvailability,
    "Where a film can be streamed, by country and platform. Cached from JustWatch/TMDB with a ~24h TTL. One row per (film, country, platform).",
  ),
];

const domainConcepts: Concept[] = [
  {
    path: "domain/film.md",
    frontmatter: {
      type: "Entity",
      title: "Film",
      description: "The core domain object — a movie with TMDB metadata, cast, crew, and scores.",
      timestamp: NOW,
    },
    body: [
      "The central Movie Haven entity, defined in `@movie-haven/types` (`Film`) and persisted by the [films](/schema/films.md) table.",
      "",
      "A `Film` carries identity (`id`, `tmdbId`), descriptive metadata (`title`, `overview`, `tagline`, `runtime`, `releaseYear`), scoring (`tmdbScore`, `popularity`), and denormalized `genres`, `directors`, and `cast` arrays sourced from TMDB.",
      "",
      "`FilmCard` is the trimmed projection used in browse/search grids — poster, title, year, score, genres, plus optional `userRating` and `streamingPlatforms`.",
    ].join("\n"),
  },
  {
    path: "domain/rating.md",
    frontmatter: {
      type: "Entity",
      title: "Rating",
      description: "A user's score for a film, optionally carrying review text.",
      timestamp: NOW,
    },
    body: [
      "A user's opinion of a [film](/domain/film.md): a `score` from 0.5 to 10 plus an optional `review` string. Persisted by the [ratings](/schema/ratings.md) table, one per (user, film).",
      "",
      "Ratings are the primary signal for the Phase-4 recommendation engine and are upserted via `users.rateFilm`.",
    ].join("\n"),
  },
  {
    path: "domain/list.md",
    frontmatter: {
      type: "Entity",
      title: "List",
      description: "A user-curated collection of films (watchlist or custom list).",
      timestamp: NOW,
    },
    body: [
      "A named collection of [films](/domain/film.md) owned by a user. Backed by [lists](/schema/lists.md) with membership rows in [list_items](/schema/list-items.md).",
      "",
      '`isWatchlist` distinguishes the canonical watchlist from ad-hoc lists (e.g. "80s Sci-Fi"); `isPublic` controls shareability.',
    ].join("\n"),
  },
  {
    path: "domain/list-item.md",
    frontmatter: {
      type: "Entity",
      title: "List item",
      description: "A film's placement within a list, with ordering and an optional note.",
      timestamp: NOW,
    },
    body: [
      "The join between a [list](/domain/list.md) and a [film](/domain/film.md), backed by [list_items](/schema/list-items.md). Carries a `position` for ordering and an optional per-entry `note`.",
    ].join("\n"),
  },
  {
    path: "domain/user.md",
    frontmatter: {
      type: "Entity",
      title: "User",
      description: "A registered account that owns ratings and lists.",
      timestamp: NOW,
    },
    body: [
      "A registered account, backed by the [users](/schema/users.md) table. Owns [ratings](/domain/rating.md) and [lists](/domain/list.md).",
      "",
      "Authentication is custom JWT via `jose`; the token carries `userId` and `email`. See [auth router](/api/auth.md).",
    ].join("\n"),
  },
];

const apiConcepts: Concept[] = [
  {
    path: "api/auth.md",
    frontmatter: {
      type: "API Surface",
      title: "auth router",
      description: "Registration, login, and username helpers; issues JWTs.",
      resource: "apps/api/src/trpc/routers/auth.ts",
      timestamp: NOW,
    },
    body: [
      "tRPC router mounted at `auth` (`apps/api/src/trpc/routers/auth.ts`). Manages accounts on the [users](/schema/users.md) table.",
      "",
      "- `register` (public mutation) — create a [user](/domain/user.md), hash password (bcrypt), return `{ user, token }`.",
      "- `login` (public mutation) — verify credentials in constant time, return `{ user, token }`.",
      "- `me` (protected query) — the authenticated user's profile.",
      "- `checkUsername` / `generateUsername` / `suggestUsernames` (public queries) — username availability + generation.",
    ].join("\n"),
  },
  {
    path: "api/films.md",
    frontmatter: {
      type: "API Surface",
      title: "films router",
      description: "Search and lookup over the film catalog.",
      resource: "apps/api/src/trpc/routers/films.ts",
      timestamp: NOW,
    },
    body: [
      "tRPC router mounted at `films` (`apps/api/src/trpc/routers/films.ts`). Reads the [films](/schema/films.md) table.",
      "",
      "- `search` (public query) — paginated `SearchResult<Film>` filtered by `FilmSearchParams` (query, genres, countries, year/score ranges, sort).",
      "- `byId` / `byTmdbId` (public queries) — single [film](/domain/film.md) lookup.",
    ].join("\n"),
  },
  {
    path: "api/users.md",
    frontmatter: {
      type: "API Surface",
      title: "users router",
      description: "Profile and rating management for the authenticated user.",
      resource: "apps/api/src/trpc/routers/users.ts",
      timestamp: NOW,
    },
    body: [
      "tRPC router mounted at `users` (`apps/api/src/trpc/routers/users.ts`). All procedures are protected.",
      "",
      "- `me` (query) — profile of the current [user](/domain/user.md).",
      "- `rateFilm` (mutation) — upsert a [rating](/domain/rating.md) (score 0.5–10, optional review ≤ 2000 chars).",
      "- `deleteRating` (mutation) — remove a rating.",
      "- `myRatings` (query) — the user's ratings, paginated.",
    ].join("\n"),
  },
  {
    path: "api/lists.md",
    frontmatter: {
      type: "API Surface",
      title: "lists router",
      description: "CRUD for user lists and their films.",
      resource: "apps/api/src/trpc/routers/lists.ts",
      timestamp: NOW,
    },
    body: [
      "tRPC router mounted at `lists` (`apps/api/src/trpc/routers/lists.ts`). All procedures are protected and scoped to the owner.",
      "",
      "- `myLists` (query) — the user's [lists](/domain/list.md).",
      "- `create` (mutation) — new list (name, optional description, `isPublic`).",
      "- `addFilm` / `removeFilm` (mutations) — manage [list items](/domain/list-item.md).",
    ].join("\n"),
  },
  {
    path: "api/tmdb.md",
    frontmatter: {
      type: "API Surface",
      title: "tmdb router",
      description: "TMDB-backed public lists for the landing page, cached in Redis.",
      resource: "apps/api/src/trpc/routers/tmdb.ts",
      timestamp: NOW,
    },
    body: [
      "tRPC router mounted at `tmdb` (`apps/api/src/trpc/routers/tmdb.ts`). Proxies TMDB via `apps/api/src/lib/tmdb.ts` and caches in Redis.",
      "",
      "- `popularMovies` (public query) — trending films for the landing carousels (6h cache).",
      "",
      "Phase-1 stories add `nowPlayingMovies`, `topBoxOfficeMovies`, and `topRatedMovies` (24h cache) — see [phases](/product/phases.md).",
    ].join("\n"),
  },
  {
    path: "api/export.md",
    frontmatter: {
      type: "API Surface",
      title: "export router",
      description: "Serializes a user's library into a downloadable OKF bundle.",
      resource: "apps/api/src/trpc/routers/export.ts",
      timestamp: NOW,
    },
    body: [
      "tRPC router mounted at `export` (`apps/api/src/trpc/routers/export.ts`). Protected.",
      "",
      "- `myLibraryOkf` (query) — builds an in-memory OKF bundle of the user's [ratings](/domain/rating.md), [lists](/domain/list.md), and an aggregate taste profile, validated before return. The web client zips and downloads it.",
      "",
      "Uses the shared `@movie-haven/okf` emitter/validator — the same code that generates this catalog.",
    ].join("\n"),
  },
];

const productConcepts: Concept[] = [
  {
    path: "product/overview.md",
    frontmatter: {
      type: "Product Doc",
      title: "Product overview",
      description: "What Movie Haven is and the problem it solves.",
      resource: "docs/PRD.md",
      timestamp: NOW,
    },
    body: [
      'Movie Haven is an intelligent film discovery platform that fixes "what should I watch tonight" paralysis with personalized, explainable recommendations.',
      "",
      "Full vision in `docs/PRD.md`. It understands a user's taste from [ratings](/domain/rating.md), [lists](/domain/list.md), and imports, then (Phase 4) blends ML scoring with LLM-written explanations.",
    ].join("\n"),
  },
  {
    path: "product/phases.md",
    frontmatter: {
      type: "Product Doc",
      title: "Delivery phases",
      description: "The five-phase rollout from landing page to production scaling.",
      resource: "docs/STORIES.md",
      timestamp: NOW,
    },
    body: [
      "Movie Haven ships in five phases (see `docs/PRD.md` §7 and `docs/STORIES.md`).",
      "",
      "1. Landing page, auth with username, demo profile, curated TMDB lists.",
      "2. Profile builder, IMDb import, ratings/reviews, watchlists, social auth.",
      "3. Filters, sorts, advanced search; streaming availability.",
      "4. ML recommendation engine + LLM explanations on a daily batch job.",
      "5. Production readiness: deployment, monitoring, security, GDPR export.",
      "",
      "Phase 1 is ~80% complete. The OKF [export router](/api/export.md) supports the Phase-5 data-portability goal.",
    ].join("\n"),
  },
];

const bundle = {
  name: "Movie Haven Knowledge Catalog",
  concepts: [...schemaConcepts, ...domainConcepts, ...apiConcepts, ...productConcepts],
};

const files = buildBundle(bundle);

const result = validateBundle(files);
console.log(formatValidation(result));
if (!result.conformant) {
  console.error("\nokf-build: bundle is NOT conformant — aborting write.");
  process.exit(1);
}

// Fresh write: clear the tracked bundle, keep any gitignored .visualize output.
const outDir = resolve(import.meta.dirname, "../../../docs/okf");
rmSync(outDir, { recursive: true, force: true });
for (const [rel, content] of Object.entries(files)) {
  const abs = join(outDir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

console.log(`\nokf-build: wrote ${Object.keys(files).length} files to ${outDir}`);

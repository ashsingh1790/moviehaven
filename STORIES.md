# User Stories by Phase

This document breaks down Movie Haven features into granular user stories. Each story is ready for implementation by an AI agent.

**Format:** Each story includes acceptance criteria, technical scope, affected files, and dependencies.

---

## Phase 1: Landing Page & Authentication (MVP)

**Phase Goal:** Functional landing page with curated lists, auth system with username support, and demo profile showcase  
**Estimated Duration:** 2 weeks  
**Status:** 🟢 In Progress (~80% complete)

---

### Feature: Landing Page

#### Story 1.1: Build Landing Page Hero Section

**Description:** Create the landing page with hero section featuring modern design and compelling tagline.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Landing page loads at `GET /` (public route)
- [x] Hero section displays:
  - Tagline: "Discover films the way you think about them"
  - CTAs: "Browse all films" + "Create free account" 
  - Modern aesthetic with gradient background and smooth transitions
- [x] CTA buttons route correctly:
  - "Browse all films" → `/films` (protected)
  - "Create free account" → `/sign-up` (public)
- [x] Navigation bar with conditional display (Sign In / Get Started for unauthenticated, Browse Films for authenticated)
- [x] Mobile responsive (works on desktop and mobile)
- [x] Footer with Movie Haven branding
- [x] Page is polished and professional

**Technical Details:**
- File: `apps/web/src/app/(auth)/page.tsx` (new landing page route)
- Component: `LandingHero` in `packages/ui/components/landing-hero.tsx`
- No API calls needed yet
- Unauthenticated route (no JWT required)

**Dependencies:**
- None (can start immediately)

**Affected Files:**
- `apps/web/src/app/(auth)/page.tsx` — New page
- `packages/ui/components/landing-hero.tsx` — New component

---

#### Story 1.2: Display Current Movies in Theater (NOW_PLAYING)

**Description:** Fetch and display current movies from TMDB's now playing endpoint on landing page.

**Status:** 🟡 IN PROGRESS (carousel exists, needs separate endpoint)

**Acceptance Criteria:**
- [ ] Fetch current movies from TMDB API (`GET /movie/now_playing`)
- [ ] Create tRPC endpoint: `tmdb.nowPlayingMovies`
- [ ] Display as horizontal scrollable carousel below hero section
- [ ] Show movie poster, title, genre tag, and IMDb rating
- [ ] Card size: 140-160px width, 2/3 aspect ratio
- [ ] List title: "In Theaters Now"
- [ ] Gracefully handle API failures (show empty state)
- [ ] Results cached in Redis for 24 hours
- [ ] Responsive on mobile (adjust card size)

**Technical Details:**
- API Endpoint: `apps/api/src/trpc/routers/tmdb.ts`
- New tRPC procedure: `publicProcedure.query('nowPlayingMovies')`
- TMDB API: `GET /movie/now_playing?language=en-US&region=US`
- Cache key: `tmdb:now-playing-movies:{limit}`
- Cache TTL: 86400 seconds (24h)
- Returns: `PopularMovie[]` (see tmdb.ts for shape)

**Client:**
- File: `apps/web/src/app/page.tsx` (already implemented)
- Component: `PopularMoviesSection` (already exists)
- API call: `serverTrpc.tmdb.nowPlayingMovies.query()`

**Dependencies:**
- Story 1.1 (landing page exists ✅)
- TMDB API token must be configured ✅

**Affected Files:**
- `apps/api/src/trpc/routers/tmdb.ts` — Add new query
- `apps/api/src/lib/tmdb.ts` — May need helper function for now playing

---

#### Story 1.3: Display Top Movies by Box Office Revenue

**Description:** Fetch and display top-grossing movies from TMDB on landing page.

**Status:** 🟡 IN PROGRESS (carousel exists, needs separate endpoint)

**Acceptance Criteria:**
- [ ] Fetch top-grossing movies from TMDB API (by revenue)
- [ ] Create tRPC endpoint: `tmdb.topBoxOfficeMovies`
- [ ] Display as horizontal scrollable carousel
- [ ] Show movie poster, title, genre tag, and IMDb rating
- [ ] List title: "Box Office Leaders"
- [ ] Card size: 140-160px width, 2/3 aspect ratio
- [ ] Gracefully handle API failures
- [ ] Results cached in Redis for 24 hours

**Technical Details:**
- API Endpoint: `apps/api/src/trpc/routers/tmdb.ts`
- New tRPC procedure: `publicProcedure.query('topBoxOfficeMovies')`
- TMDB API: Use `discover` endpoint sorted by revenue or use `GET /movie/top_rated`
- Cache key: `tmdb:box-office-movies:{limit}`
- Cache TTL: 86400 seconds (24h)
- Returns: `PopularMovie[]`

**Client:**
- Use existing `PopularMoviesSection` carousel component
- Add to landing page below "In Theaters Now"

**Dependencies:**
- Story 1.1 (landing page structure) ✅
- Story 1.2 (carousel pattern established) ✅

**Affected Files:**
- `apps/api/src/trpc/routers/tmdb.ts` — Add new query
- `apps/web/src/app/page.tsx` — Add carousel section

---

#### Story 1.4: Display Top Movies by IMDb Rating

**Description:** Fetch and display top-rated movies from TMDB on landing page.

**Status:** 🟡 IN PROGRESS (carousel exists, needs separate endpoint)

**Acceptance Criteria:**
- [ ] Fetch top-rated movies from TMDB API (`GET /movie/top_rated`)
- [ ] Create tRPC endpoint: `tmdb.topRatedMovies`
- [ ] Display as horizontal scrollable carousel
- [ ] Show movie poster, title, genre tag, and IMDb rating (prominently)
- [ ] List title: "Top Rated Movies"
- [ ] Card size: 140-160px width, 2/3 aspect ratio
- [ ] Sorted by rating descending
- [ ] Gracefully handle API failures
- [ ] Results cached in Redis for 24 hours

**Technical Details:**
- API Endpoint: `apps/api/src/trpc/routers/tmdb.ts`
- New tRPC procedure: `publicProcedure.query('topRatedMovies')`
- TMDB API: `GET /movie/top_rated?language=en-US`
- Cache key: `tmdb:top-rated-movies:{limit}`
- Cache TTL: 86400 seconds (24h)
- Returns: `PopularMovie[]`

**Client:**
- Use existing `PopularMoviesSection` carousel component
- Add to landing page below "Box Office Leaders"

**Dependencies:**
- Story 1.1, 1.2, 1.3 ✅

**Affected Files:**
- `apps/api/src/trpc/routers/tmdb.ts` — Add new query
- `apps/web/src/app/page.tsx` — Add carousel section

---

### Feature: Authentication

#### Story 1.5: User Registration (Email/Password)

**Description:** Allow users to sign up with email, optional username, and password.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Registration form at `/sign-up`
- [x] Fields: Email, Password, Username (optional)
- [x] Email validation (valid email format)
- [x] Password validation: min 8 chars, 1 uppercase, 1 number
- [x] Username validation: 3-30 chars, alphanumeric + underscore
- [x] Real-time username availability checking
- [x] Username generation button for convenience
- [x] Username suggestions if chosen name is taken
- [x] Submit button disabled until all fields valid
- [x] Error messages for validation failures
- [x] API call to `POST /api/auth/register`
- [x] On success: Create user in DB, set JWT cookie, redirect to `/films`
- [x] On error: Display error message (e.g., "Email already exists")
- [x] Password strength indicator (visual feedback)
- [x] Duplicate email prevention via unique constraint

**Technical Details:**

**Backend:**
- File: `apps/api/src/routers/auth.ts` (or API route)
- Endpoint: `POST /api/auth/register`
- Handler: `registerHandler(email: string, password: string)`
  - Hash password with bcrypt
  - Check if email exists → throw CONFLICT error
  - Insert user into `users` table
  - Generate JWT token (via `jose`)
  - Return: `{ userId: string, token: string }`

**Frontend:**
- File: `apps/web/src/app/(auth)/sign-up/page.tsx`
- Component: `SignUpForm` in `packages/ui/components/auth/sign-up-form.tsx`
- Form validation with React Hook Form + Zod
- tRPC mutation: `trpc.auth.register.useMutation()`
- On success: Store JWT in cookie (httpOnly, secure), redirect

**Database:**
- Table: `users` (already exists in schema)
- Ensure: `email` unique constraint, `password_hash` field

**Dependencies:**
- Database schema exists (`users` table)
- JWT secret configured in `.env`

**Affected Files:**
- `apps/api/src/routers/auth.ts` — Register endpoint
- `apps/web/src/app/(auth)/sign-up/page.tsx` — Sign-up page
- `packages/ui/components/auth/sign-up-form.tsx` — Form component
- `packages/db/schema.ts` — Ensure `users` table has required fields

---

#### Story 1.6: User Login

**Description:** Allow users to log in with email and password.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Login form at `/sign-in`
- [x] Fields: Email, Password
- [x] Email and password required
- [x] API call to `POST /api/auth/login`
- [x] On success: Set JWT cookie, redirect to `/films`
- [x] On error: Display error (generic "Invalid email or password")
- [x] Error doesn't reveal which field is wrong (timing attack resistant)
- [x] "Forgot Password" link (placeholder, TBD in Phase 2)
- [x] "Sign Up" link for new users
- [x] Remember me checkbox (optional, TBD)
- [x] Form validation prevents submission of invalid data

**Technical Details:**

**Backend:**
- File: `apps/api/src/routers/auth.ts`
- Endpoint: `POST /api/auth/login`
- Handler: `loginHandler(email: string, password: string)`
  - Query `users` table by email
  - If not found OR password doesn't match → throw UNAUTHORIZED (same message for both)
  - Generate JWT token
  - Return: `{ userId: string, token: string }`

**Frontend:**
- File: `apps/web/src/app/(auth)/sign-in/page.tsx`
- Component: `LoginForm` in `packages/ui/components/auth/login-form.tsx`
- Form validation with React Hook Form + Zod
- tRPC mutation: `trpc.auth.login.useMutation()`
- On success: Store JWT in cookie, redirect to `/app`

**Dependencies:**
- Story 1.5 (auth infrastructure in place)

**Affected Files:**
- `apps/api/src/routers/auth.ts` — Login endpoint
- `apps/web/src/app/(auth)/sign-in/page.tsx` — Login page
- `packages/ui/components/auth/login-form.tsx` — Form component

---

#### Story 1.7: JWT Token Management & Middleware

**Description:** Implement JWT token generation, validation, and route protection.

**Status:** ✅ DONE (Bug fixed: /films now protected)

**Acceptance Criteria:**
- [x] JWT created on login/register, stored in cookie (`movie_haven_session`)
- [x] Token signed with JWT_SECRET from `.env` using `jose` library
- [x] Token includes: `userId`, `email`, `iat`, `exp` (24h expiry)
- [x] Middleware at `apps/web/src/middleware.ts` verifies JWT on every request
- [x] Unauthenticated users redirected to `/sign-in` with `next` parameter
- [x] Authenticated users can access protected routes
- [x] Public paths: `/`, `/sign-in`, `/sign-up` (not `/films`)
- [x] Protected paths: `/films`, `/app/*` (require valid JWT)
- [x] Expired tokens delete cookie and redirect to `/sign-in`
- [x] API extracts `userId` from JWT payload in context
- [x] `protectedProcedure` throws UNAUTHORIZED if `userId` is null
- [x] tRPC client automatically adds `Authorization: Bearer {token}` header

**Technical Details:**

**Backend:**
- Use `jose` library for JWT operations
- Function: `generateJWT(userId: string) → token: string`
  - Payload: `{ userId, iat: now, exp: now + 24h }`
  - Sign with `JWT_SECRET`
- Function: `verifyJWT(token: string) → { userId: string } | null`
  - Verify signature
  - Check expiry
  - Return userId or null

**Frontend Middleware:**
- File: `apps/web/src/middleware.ts` (already exists in CLAUDE.md)
- On every request:
  - Read `movie_haven_session` cookie
  - Verify JWT validity
  - If invalid/expired: redirect to `/sign-in`
  - If valid: attach `userId` to request

**Client-Side tRPC:**
- File: `apps/web/src/lib/trpc/client.tsx`
- Automatically include JWT as `Authorization: Bearer {token}` header in all tRPC calls

**API Context:**
- File: `apps/api/src/trpc/context.ts` (already exists)
- Extract `userId` from Bearer token
- Pass to all procedures

**Dependencies:**
- Stories 1.5, 1.6 (auth endpoints exist)

**Affected Files:**
- `apps/api/src/lib/jwt.ts` (new) — JWT utilities
- `apps/web/src/middleware.ts` — Route protection
- `apps/api/src/trpc/context.ts` — Token extraction
- `apps/web/src/lib/trpc/client.tsx` — Add Authorization header
- `.env.example` files — Document JWT_SECRET

---

#### Story 1.8: Logout Functionality

**Description:** Allow users to log out and clear session.

**Status:** ✅ DONE

**Acceptance Criteria:**
- [x] Logout button in app header/navbar
- [x] On click: Clear JWT cookie and redirect to `/` (home)
- [x] API endpoint: `POST /api/auth/logout` (stateless, just clears cookie)
- [x] No data persisted on backend (stateless auth)
- [x] User state cleared in context on logout
- [x] Refreshing page after logout shows home/sign-in page (via middleware)

**Technical Details:**

**Backend:**
- Endpoint: `POST /api/auth/logout`
- Handler: Clears `movie_haven_session` cookie
- Returns: `{ success: true }`

**Frontend:**
- Logout button in auth context (`useAuth().logout()`)
- On click: Call `/api/auth/logout`, clear user state, redirect to `/`
- Integration: Added to layouts/headers as needed

**Dependencies:**
- Story 1.7 (JWT in place) ✅

**Affected Files:**
- `apps/web/src/app/api/auth/logout/route.ts` — Logout endpoint ✅
- `apps/web/src/contexts/auth-context.tsx` — Logout function ✅

---

### Feature: Demo Profile

#### Story 1.9: Seed Demo Database with 500 Movies & 100 Ratings

**Description:** Create a database script that populates demo data: 500 movies and 100 sample ratings for the demo profile.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] 500 movies seeded into `films` table (from TMDB API, paginated fetch)
- [ ] Movies span multiple genres, decades, release years, ratings
- [ ] 100 sample ratings created in `ratings` table
- [ ] Sample data tied to a demo user account (`demo@moviehaven.test`)
- [ ] Demo data is deterministic (reproducible seeding)
- [ ] Seed script is idempotent (safe to run multiple times)
- [ ] Data includes: title, plot, runtime, release date, cast, genres, TMDB rating, posters
- [ ] Demo user created with known credentials

**Technical Details:**

**Implementation:**
- Create Node.js script: `apps/api/scripts/seed-demo.ts`
- Approach: Fetch top movies from TMDB across categories, insert into DB
  
**Steps:**
1. Create demo user if not exists:
   - Email: `demo@moviehaven.test`
   - Username: `demo_user`
   - Password: `DemoPass123!`
2. Fetch 500 movies from TMDB:
   - Page through popular, top-rated, upcoming movies
   - Avoid duplicates
   - Ensure all required fields populated
3. Create 100 ratings tied to demo user:
   - Random movies from the 500
   - Ratings 1-10 (varied distribution)
   - Optional reviews for some ratings
4. Verify data integrity

**Running the Script:**
```bash
# From project root
pnpm --filter @movie-haven/api seed:demo
```

**Dependencies:**
- Database schema finalized ✅
- TMDB API key available ✅
- Database connection configured ✅

**Affected Files:**
- `apps/api/scripts/seed-demo.ts` — New seed script
- `apps/api/package.json` — Add script command
- `.env.example` — Document demo credentials

---

#### Story 1.10: Create Demo Profile Page & Button

**Description:** Create a public demo profile page showcasing the demo user with a button on landing page.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] Route accessible at `/demo` without authentication
- [ ] Demo button on landing page (top right corner or prominent location)
- [ ] Button routes to `/demo` on click
- [ ] Demo profile displays:
  - User header with avatar, email, stats (# ratings, # lists)
  - Tabs: Ratings, Watchlist, Reviews
  - All 100 sample ratings displayed with user ratings/reviews
  - Sample watchlist shown (5-10 curated movies)
- [ ] Shows filters (Genre, Actor, Director, Country, Streaming) as UI
- [ ] Shows sorting options (Rating, Release Year, Added Date)
- [ ] Mobile responsive
- [ ] Demonstrates full feature set (even if partially placeholders)

**Technical Details:**

**Backend:**
- Endpoint: `publicProcedure.query('demo.profile')`
  - Returns: Demo user data + all ratings + sample watchlist
  - No authentication required
- Endpoint: `publicProcedure.query('demo.ratings')`
  - Returns paginated ratings for demo user

**Frontend:**
- File: `apps/web/src/app/demo/page.tsx` (new public route)
- Components:
  - `DemoProfile` — Main page showing user stats
  - `DemoRatingsTab` — List of ratings with filters/sorts
  - `DemoWatchlistTab` — Sample watchlist display
- Landing page (`apps/web/src/app/page.tsx`):
  - Add "Demo Profile" button (small, top right)
  - Link to `/demo`

**Dependencies:**
- Story 1.9 (demo data seeded)

**Affected Files:**
- `apps/web/src/app/demo/page.tsx` — New demo page
- `apps/api/src/trpc/routers/public.ts` or new `demo.ts` router
- `apps/web/src/app/page.tsx` — Add demo button

---

#### Story 1.11: Display Demo Ratings with Filters & Sorts (UI Layer)

**Description:** Build UI to display demo user's ratings with interactive filters and sorts.

**Status:** 🟡 PENDING

**Acceptance Criteria:**
- [ ] Display all 100 ratings in a table/grid layout with pagination or infinite scroll
- [ ] Columns: Movie Poster, Title, User Rating (1-10 stars), IMDb Rating, Release Year
- [ ] Filter sidebar shows (functional):
  - Genre dropdown (functional filter)
  - Actor dropdown (functional filter)
  - Director dropdown (functional filter)
  - Country dropdown (functional filter)
- [ ] Sort dropdown with options (functional):
  - IMDb rating (ascending/descending)
  - Release year (ascending/descending)
  - User rating (ascending/descending)
- [ ] Filters and sorts work together (AND logic)
- [ ] Clear filters button
- [ ] Show count: "Showing X of 100"
- [ ] Mobile responsive (card layout on mobile, table on desktop)
- [ ] Matches design style of `/films` browser (reuse components)

**Technical Details:**

**Frontend:**
- File: `apps/web/src/app/demo/page.tsx` — Reuse existing `/films` layout
- Components: Reuse `FiltersPanel`, `SortChips`, `RatingsTable` from `/films`
- State: Use URL query params for filters/sorts (shareable links)
  - Example: `/demo?genre=Action&sort=rating&order=desc`
  - Use `nuqs` library (already in project)
- Filter logic: Client-side filtering (all 100 ratings loaded)

**Backend:**
- Endpoint: `publicProcedure.query('demo.ratings')`
  - Input: filters, sorts, page, limit
  - Returns: Ratings with full movie metadata, pagination info
  - No DB filtering needed (small dataset)

**Dependencies:**
- Story 1.10 (demo profile page)
- Story 1.9 (demo data exists)
- Existing filter components from `/films` ✅

**Affected Files:**
- `apps/web/src/app/demo/page.tsx` — Add ratings tab
- `apps/api/src/trpc/routers/public.ts` — Add demo.ratings query
- Reuse: `FiltersPanel`, `SortChips` from existing code

---

#### Story 1.12: Protected /films Route & Main App Layout

**Description:** Ensure `/films` route is properly protected and add authenticated app layout with navigation.

**Status:** 🟡 IN PROGRESS (route protected ✅, layout exists, needs refinement)

**Acceptance Criteria:**
- [x] Route at `/films` requires JWT authentication
- [x] Unauthenticated users redirected to `/sign-in`
- [x] Authenticated users see films browser with filters/sorts
- [ ] Navigation bar with:
  - Movie Haven logo (links to `/films` for authenticated, `/` for unauthenticated)
  - Search bar (TBD)
  - User menu with:
    - Profile link (Phase 2)
    - Settings link (Phase 2)
    - Logout button
- [ ] Sidebar or main navigation showing:
  - My Ratings (Phase 2)
  - My Watchlists (Phase 2)
  - Recommendations (Phase 4)
- [ ] Mobile-friendly navigation (hamburger menu)
- [ ] User greeting/display (name or email)

**Technical Details:**

**Backend:**
- Endpoint: `protectedProcedure.query('auth.me')` ✅ Exists in auth router
  - Returns current user info: `{ userId, email, username, displayName }`
  - Throws UNAUTHORIZED if no token

**Frontend:**
- File: `apps/web/src/app/(main)/films/page.tsx` ✅ Exists
- Layout: `apps/web/src/app/(main)/layout.tsx` (exists, may need refinement)
  - Header with navigation
  - Logout button in header
- Main `/films` page already has films browser with filters/sorts ✅

**Routing:**
- `(main)` route group for authenticated pages ✅
- Middleware protects all routes under `/main/*` ✅
- Public paths: `/`, `/sign-in`, `/sign-up` ✅

**Dependencies:**
- Stories 1.5, 1.6, 1.7 (auth complete) ✅

**Affected Files:**
- `apps/web/src/app/(main)/layout.tsx` — Refine navigation
- `apps/web/src/app/(main)/films/page.tsx` — Already done ✅
- `apps/api/src/trpc/routers/auth.ts` — auth.me query ✅

---

## Research Spikes

**Purpose:** Timeboxed investigations (1-3 days) to answer critical questions about complex features *before* building them.

**When to use:** For features with high uncertainty, multiple options, or significant architectural impact.

---

### Spike 1.S1: LLM Provider Evaluation for Recommendations

**Description:** Evaluate Claude, OpenAI, and Google Gemini for generating recommendation explanations. Determine cost, quality, latency, and best practices.

**Status:** 🟡 PENDING (needed before Phase 4)

**Goal:** Answer these questions before Phase 4 implementation:
- [ ] Which provider has best explanation quality?
- [ ] Which is most cost-effective with caching?
- [ ] What's the latency for each provider?
- [ ] Does prompt caching work as expected in Node.js SDK?
- [ ] What fallback strategy if LLM API fails?

**Deliverables:**
- Cost breakdown for 1000 users, 10 recommendations each (per provider)
- Sample explanations from each provider (quality comparison)
- Latency measurements (p50, p95, p99)
- Recommended provider + setup instructions
- Code example for chosen provider

**Suggested Approach:**
1. Create test script: `apps/api/scripts/test-llm-providers.ts`
2. Set up API keys for Claude, OpenAI, Google
3. Generate 20 sample explanations from each
4. Measure: cost, latency, quality
5. Document findings in `LLM_INTEGRATION.md` ✅ (already done!)

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent

**Definition of Done:**
- [ ] All 3 providers tested with real recommendations
- [ ] Cost spreadsheet created (monthly projections)
- [ ] Latency benchmarks recorded
- [ ] Quality comparison document (with sample outputs)
- [ ] Recommended provider selected + rationale documented
- [ ] Decision logged in PRD.md

---

### Spike 1.S2: Streaming Availability API Integration

**Description:** Investigate JustWatch and TMDB APIs for real-time streaming availability by region.

**Status:** 🟡 PENDING (needed before Phase 3)

**Goal:** Answer these questions:
- [ ] Which API has best coverage (movies, regions, providers)?
- [ ] What's the rate limit and cost?
- [ ] How fresh is the data (update frequency)?
- [ ] Can we cache availability (24h TTL)?
- [ ] What's needed for region detection (IP, user setting)?

**Deliverables:**
- API comparison matrix (coverage, freshness, cost, rate limits)
- Sample data from each API (structure, completeness)
- Region detection strategy (user setting vs. IP-based)
- Caching plan (24h TTL, invalidation strategy)
- Implementation plan for Phase 3

**Suggested Approach:**
1. Sign up for JustWatch and TMDB developer accounts
2. Test APIs with sample movies (10-20 films)
3. Compare response structure, completeness, latency
4. Document rate limits and pricing
5. Build small prototype: fetch + cache availability for 10 movies

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent

**Definition of Done:**
- [ ] Both APIs tested and documented
- [ ] Sample API responses captured
- [ ] Pricing/rate limit comparison created
- [ ] Region detection approach decided
- [ ] Caching strategy documented
- [ ] Implementation plan ready for Phase 3

---

### Spike 1.S3: IMDb Data Import Strategy

**Description:** Research IMDb export formats, data mapping, and bulk import process for user watchlists and ratings.

**Status:** 🟡 PENDING (needed before Phase 2)

**Goal:** Answer these questions:
- [ ] What export formats does IMDb support (CSV, JSON, XML)?
- [ ] How complete is the exported data (movie IDs, ratings, dates)?
- [ ] Can we reliably map IMDb movie IDs to TMDB IDs?
- [ ] What's the bulk import performance (1000 ratings in how long)?
- [ ] How do we handle missing movies (not in our DB)?

**Deliverables:**
- IMDb export format documentation (sample file)
- Mapping strategy (IMDb ID → TMDB ID)
- SQL schema for bulk import
- Performance benchmarks (import speed for 1K, 10K ratings)
- Error handling strategy (missing movies, invalid data)
- User-facing import instructions

**Suggested Approach:**
1. Export your own IMDb watchlist and ratings (test data)
2. Analyze the CSV/JSON structure
3. Research IMDb ID ↔ TMDB ID mapping APIs
4. Build import script: `apps/api/scripts/import-imdb-data.ts`
5. Benchmark with 100, 500, 1000 ratings
6. Document any data loss or edge cases

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent

**Definition of Done:**
- [ ] IMDb export formats documented (with samples)
- [ ] TMDB mapping strategy tested (success rate documented)
- [ ] Import script created and benchmarked
- [ ] Error handling for missing movies implemented
- [ ] User guide written (how to export from IMDb)
- [ ] Ready for Phase 2 implementation

---

### Spike 2.S1: ML Recommendation Engine Algorithm Selection

**Description:** Research and prototype collaborative filtering and content-based filtering algorithms to find best approach for Movie Haven.

**Status:** 🟡 PENDING (needed before Phase 4)

**Goal:** Answer these questions:
- [ ] What algorithm gives best recommendation quality?
- [ ] Is collaborative filtering alone sufficient or do we need hybrid?
- [ ] How much data (ratings) do we need before recommendations are good?
- [ ] Can we compute recommendations in Node.js or need Python/ML service?
- [ ] What's the computational cost for 1000, 10K, 100K users?

**Deliverables:**
- Algorithm comparison (collaborative vs. content-based vs. hybrid)
- Prototype implementation in Node.js
- Performance benchmarks (speed, accuracy)
- Dataset requirements (minimum ratings for good recommendations)
- Recommendation quality metrics (precision, recall, diversity)
- Architecture decision (Node.js vs. Python worker vs. ML service)

**Suggested Approach:**
1. Study collaborative filtering basics (user-user, item-item, matrix factorization)
2. Build prototype in Node.js using basic math libraries
3. Use your demo data (500 movies, 100 ratings) as test set
4. Measure: How many users like movie X? How similar are two movies?
5. Generate sample recommendations and manually evaluate quality
6. Compare with simpler rule-based recommendations (baseline)

**Time estimate:** 3-5 days  
**Responsible team:** 1-2 agents

**Definition of Done:**
- [ ] Algorithm research document completed
- [ ] Prototype implementations created (at least 2 algorithms)
- [ ] Performance benchmarks on demo data
- [ ] Recommendation quality evaluation (manual review of top 10)
- [ ] Architecture recommendation (Node.js vs. external)
- [ ] Ready for Phase 4 implementation

---

### Spike 4.S1: LLM Prompt Engineering for Recommendations

**Description:** Develop and optimize prompts to generate high-quality, natural-sounding movie recommendation explanations.

**Status:** 🟡 PENDING (part of Phase 4)

**Goal:** Answer these questions:
- [ ] What prompt structure produces best explanations?
- [ ] How many user preferences should we include (vs. too much context)?
- [ ] Should we use different prompts for different movies/genres?
- [ ] How much does explanation quality vary with model (Sonnet vs. Opus)?
- [ ] Can we measure explanation quality programmatically?

**Deliverables:**
- 5-10 prompt variations tested and compared
- Sample explanations showing quality differences
- Final prompt template (for Phase 4 implementation)
- Style guide (tone, length, specificity)
- Quality evaluation rubric (for manual review)
- Cost analysis (tokens per explanation with final prompt)

**Suggested Approach:**
1. Start with basic prompt (see LLM_INTEGRATION.md Example 1)
2. Iterate: Add user context, adjust tone, add examples
3. Generate explanations for 20 test cases (varied movies/genres)
4. Manually review for quality (is it specific? does it reference user taste? etc.)
5. Measure token usage per prompt version
6. Pick best prompt and document rationale

**Time estimate:** 2-3 days  
**Responsible team:** 1 agent + user feedback

**Definition of Done:**
- [ ] 10+ prompt variations tested
- [ ] Quality comparison spreadsheet created
- [ ] Final prompt template selected and documented
- [ ] Sample outputs showing quality level
- [ ] Style guide for explanations (tone, length, specificity)
- [ ] Token cost per explanation measured
- [ ] Ready for Phase 4 implementation

---

## Phase 2: Profile Builder & Data Import

> Stories for Phase 2 will be added after Phase 1 is complete and spikes are resolved.

---

## Implementation Guidelines for Agents

### Before Starting

1. **Read the PRD** — Understand the feature context from [PRD.md](./PRD.md)
2. **Check dependencies** — Ensure all prerequisite stories are completed
3. **Review the schema** — Check `packages/db/schema.ts` for table structures
4. **Check existing code** — Review similar patterns in `apps/api/src/routers/` and `apps/web/src/`

### During Implementation (Test-Driven Development)

**1. Write Tests First (RED phase):**
- Write unit tests for new functions before implementing them
- Write integration tests for API endpoints
- Write component tests for new React components
- Tests will FAIL initially (this is expected)
- See [TESTING.md](./TESTING.md) for examples

**2. Implement Minimal Code (GREEN phase):**
- Write minimal code to make tests pass
- No over-engineering; solve exactly what the test requires
- All tests should PASS

**3. Code Quality:**
- **Follow conventions** — Match code style in existing routers/components
- **Use TypeScript** — Strict type checking, no `any`
- **Error handling** — Throw appropriate tRPC errors (`UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, etc.)
- **Database queries** — Use Drizzle ORM, not raw SQL
- **API responses** — Always return typed objects, use `packages/types/` for shared types
- **Environment variables** — Add to `.env.example` files

**4. Test Quality:**
- Unit tests for pure functions (utilities, validators, formatters)
- Integration tests for API endpoints (with real DB)
- Component tests for React components (user interactions)
- E2E tests for critical user flows (sign up → browse → rate)
- Test error cases (missing data, validation failures, API errors)
- Test edge cases (empty input, null values, special characters)
- All tests must PASS before committing

**5. Coverage Requirements:**
- Critical paths (auth, recommendations): 90% coverage
- Core features (films, ratings): 80% coverage
- UI components: 70% coverage
- Overall: 80% coverage minimum

See [TESTING.md](./TESTING.md) for detailed testing guide with examples.

### Completion Checklist (Test-Driven Development)

**RED Phase (Write Tests First):**
- [ ] Unit tests written for new functions
- [ ] Integration tests written for API endpoints
- [ ] Component tests written for new React components
- [ ] All tests FAIL (code doesn't exist yet)

**GREEN Phase (Write Minimal Code):**
- [ ] Write minimal code to make tests pass
- [ ] All tests PASS
- [ ] Code compiles without errors
- [ ] No TypeScript errors (`pnpm type-check`)

**REFACTOR Phase (Improve Code):**
- [ ] Refactor for clarity and efficiency
- [ ] All tests still PASS
- [ ] No linting issues (`pnpm lint`)
- [ ] Code review comments addressed

**VERIFICATION Phase (Ensure It Works):**
- [ ] All acceptance criteria met
- [ ] Feature tested in browser (manual)
- [ ] Edge cases tested (error states, empty input, etc.)
- [ ] No regressions in existing tests
- [ ] Coverage maintained (no decrease)

**FINAL:**
- [ ] Commit message explains the "why" and references tests
- [ ] All CI/CD checks pass

**Testing Coverage by Story:**
- Auth stories (1.5-1.8): **90% coverage required**
- Data import stories: **80% coverage required**
- UI stories: **70% coverage required**
- Recommendation stories: **85% coverage required**

---

**Last Updated:** May 24, 2026  
**Next Phase:** Phase 2 stories will be added after Phase 1 completion

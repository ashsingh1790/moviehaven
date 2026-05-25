# Implementation Audit: Existing Code vs. PRD

**Date:** May 24, 2026  
**Status:** Phase 1 substantially complete; some design choices differ from PRD

This document compares what's been built against the PRD and STORIES.md, highlights design patterns, and flags decisions to revisit.

---

## Executive Summary

**Status:** Phase 1 is ~80% complete. Core auth, landing page, and films browser are working. However, several design choices differ from the PRD and STORIES.md, particularly around demo profiles, authentication, and LLM placeholder routers.

**Key Differences:**
1. ✅ Auth is working but uses **username** instead of email-only
2. ✅ Landing page built with modern design (better than PRD spec)
3. ✅ Films browser with filters/sorts implemented (exceeds Phase 1 scope)
4. ❌ No demo profile or demo button yet
5. ❌ No specific "now playing", "box office", "top rated" endpoints (only generic TMDB popular)
6. ⚠️ Lists router references deprecated `clerkId` field
7. ⚠️ Some auth routes missing (logout, me endpoint duplication)

---

## Phase 1 Breakdown: What's Done vs. PRD

### Feature: Landing Page ✅ DONE (Enhanced)

#### Story 1.1: Landing Page Hero ✅ DONE
- **File:** `apps/web/src/app/page.tsx`
- **Status:** ✅ Implemented (exceeds spec)
- **Design Notes:**
  - Modern hero with gradient background blur effect
  - Tagline: "Discover films the way you think about them" (different from PRD's "What should you watch tonight?")
  - Two CTAs: "Browse all films" + "Create free account"
  - Conditional display based on auth state
  - Navigation bar with responsive buttons
  - Footer with disclaimer
  - **Design Style:** Tailwind CSS, glassmorphism, gradient accents, smooth transitions
  
**Decision Needed:** Keep current hero tagline or update to PRD's version?

---

#### Story 1.2-1.4: Movie Lists (Now Playing, Box Office, Top Rated) ⚠️ PARTIAL

**Implemented:**
- ✅ `tmdbRouter.popularMovies` endpoint (`apps/api/src/trpc/routers/tmdb.ts`)
- ✅ PopularMoviesSection component on landing page
- ✅ Carousel UI with movie cards, rating badges, genre tags
- ✅ Redis caching (6-hour TTL, hardcoded)

**Not Implemented:**
- ❌ Separate "Now Playing" endpoint (using generic popular instead)
- ❌ Separate "Box Office" endpoint
- ❌ Separate "Top Rated" endpoint
- ❌ Film metadata seeding into database

**Design Notes:**
- Uses TMDB API directly (not database)
- Movies returned as `PopularMovie` type (not `Film` from DB)
- Cache key pattern: `tmdb:popular-movies:{limit}`
- Movie shaping function handles null values gracefully
- Poster sizing: w500 (medium), w780 (backdrop)

**Decision Needed:**
1. Create separate endpoints for each list, or keep generic "popular"?
2. Populate `films` table with TMDB data for better querying?
3. Update cache TTL (currently 6h, PRD says 24h)?

---

### Feature: Authentication ✅ DONE

#### Story 1.5: User Registration ✅ DONE
- **Files:**
  - Backend: `apps/api/src/trpc/routers/auth.ts` (register procedure)
  - Frontend: `apps/web/src/app/(auth)/sign-up/page.tsx`
  - API Route: `apps/web/src/app/api/auth/register/route.ts`
- **Status:** ✅ Implemented
- **Design Notes:**
  - Email validation (valid email format)
  - Password requirements: 8+ chars, 1 uppercase, 1 number
  - **NEW:** Username field (optional, not in PRD)
    - Real-time availability check
    - Auto-suggest usernames if taken
    - Generate random username button
  - Password strength indicator (4-level visual feedback)
  - Error handling with specific error messages
  - Form validation prevents submission of invalid data

**Differences from PRD:**
- PRD specified "email/password OR social login" → Currently email/password only
- PRD mentioned no username → Now has optional username with validation

**Design Style:**
- Form inputs with inline validation
- Icon-based feedback (check mark, X, loader)
- Rounded borders, primary color accents
- Tailwind CSS with custom gradients and transitions

---

#### Story 1.6: User Login ✅ DONE
- **Files:**
  - Backend: `apps/api/src/trpc/routers/auth.ts` (login procedure)
  - Frontend: `apps/web/src/app/(auth)/sign-in/page.tsx`
  - API Route: `apps/web/src/app/api/auth/login/route.ts`
- **Status:** ✅ Implemented
- **Design Notes:**
  - Email + password fields
  - Constant-time password comparison (security best practice ✅)
  - Generic error message for both "user not found" and "wrong password" ✅
  - Session cookie set on success
  - "Forgot Password" link (placeholder, not implemented)
  - "Sign Up" link for new users

---

#### Story 1.7: JWT & Middleware ✅ DONE
- **Files:**
  - Backend: `apps/api/src/lib/jwt.ts`, `apps/api/src/trpc/context.ts`
  - Frontend: `apps/web/src/middleware.ts`, `apps/web/src/lib/auth.ts`
  - tRPC Client: `apps/web/src/lib/trpc/client.tsx`
- **Status:** ✅ Implemented
- **Design Notes:**
  - JWT library: `jose` (correct choice)
  - Token payload: `{ userId, email, iat, exp }`
  - Expiry: Hardcoded (need to check, should be 24h)
  - Cookie name: `movie_haven_session`
  - Middleware public paths: `/`, `/sign-in`, `/sign-up`, `/films`
  - ⚠️ **Issue:** `/films` is public in middleware but should be protected!
  - Auth context stores user state client-side
  - tRPC client automatically adds `Authorization: Bearer {token}` header

**Bug Found:**
```typescript
// apps/web/src/middleware.ts line 6
const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/films"];
// ⚠️ /films should be PROTECTED, not public!
```

---

#### Story 1.8: Logout ✅ DONE
- **Files:**
  - API Route: `apps/web/src/app/api/auth/logout/route.ts`
  - Context: `apps/web/src/contexts/auth-context.tsx`
- **Status:** ✅ Implemented
- **Behavior:**
  - POST endpoint clears session cookie
  - Context logout function calls `/api/auth/logout`, clears user state, redirects to `/`

---

### Feature: Demo Profile ❌ NOT STARTED

#### Story 1.9: Seed Demo Data ❌ NOT DONE
- Status: No demo user, no 500 movies, no 100 ratings
- **Decision Needed:** Is demo profile still needed, or skip to Phase 2?

#### Story 1.10-1.11: Demo Profile Page ❌ NOT DONE
- Status: No demo profile route or UI
- **Decision Needed:** Same as above

---

## Design Patterns & Style Analysis

### Architecture

**Backend (API):**
- Framework: Fastify 5 + tRPC v11 ✅
- Database: Drizzle ORM ✅
- Caching: Redis with key-value patterns
- Error Handling: tRPC errors (UNAUTHORIZED, CONFLICT, NOT_FOUND, INTERNAL_SERVER_ERROR)
- Input Validation: Zod schemas ✅

**Frontend (Web):**
- Framework: Next.js 15 App Router ✅
- Client tRPC: TanStack Query integration ✅
- State Management: React Context (auth) + URL params (filters via nuqs)
- Styling: Tailwind CSS + custom utilities
- Components: shadcn/ui + custom components
- Auth: Custom JWT + cookies ✅

### Code Style Observations

**What's Consistent:**
1. TypeScript everywhere (strict mode)
2. Zod for runtime validation
3. Descriptive variable/function names
4. Error messages are user-friendly
5. UI is modern, polished, responsive
6. Filters/sorts use URL state (shareable links)

**What's Unique:**
1. **Username Generation:** Clever feature not in PRD
2. **Real-time Username Check:** Via tRPC with debouncing
3. **Password Strength Indicator:** Visual feedback on signup
4. **Genre Labels Hardcoded:** Mapping TMDB genre IDs in component (Story 1.2)
5. **Graceful Degradation:** Error boundaries, fallback UI

### Database Schema

**What Exists:**
- ✅ `users` — email, username, displayName, avatarUrl, passwordHash, timestamps
- ✅ `films` — TMDB data (title, plot, ratings, genres, cast, directors, etc.)
- ✅ `ratings` — user ratings + reviews (score, review text)
- ✅ `lists` — user watchlists
- ✅ `listItems` — films in a list
- ✅ `streamingAvailability` — streaming service availability

**Issues Found:**
- ⚠️ `lists.ts` router references `users.clerkId` but that field doesn't exist!
- This suggests lists feature is not fully wired

---

## Differences Between Implementation & PRD/STORIES

### 1. Authentication

| Aspect | PRD | Implemented | Status |
|--------|-----|-------------|--------|
| Email/password | ✅ Yes | ✅ Yes | Matches |
| Social login | ✅ Yes | ❌ No | Not done |
| Username | ❌ Not mentioned | ✅ Yes (optional) | Enhanced |
| Password requirements | 8 chars, 1 upper, 1 number | 8 chars, 1 upper, 1 number | Matches |
| Username generation | ❌ Not mentioned | ✅ Yes | Enhanced |
| Real-time username check | ❌ Not mentioned | ✅ Yes | Enhanced |

**Verdict:** Implementation exceeds PRD with optional username and username suggestions.

### 2. Landing Page

| Aspect | PRD | Implemented | Status |
|--------|-----|-------------|--------|
| Hero section | "What should you watch tonight?" | "Discover films the way you think about them" | Different tagline |
| CTA button | "Create Your Movie Haven" | "Browse all films" + "Create free account" | Different, more intuitive |
| Now Playing list | ✅ Below hero | ✅ Below hero | Matches |
| Box Office list | ✅ Below now playing | ⚠️ Not separate (using "popular") | Incomplete |
| Top Rated list | ✅ Below box office | ⚠️ Not separate (using "popular") | Incomplete |
| Design | "Google-like minimal" | Modern gradient, glassmorphism | Enhanced |

**Verdict:** Implementation looks better, but missing separate list endpoints.

### 3. Demo Profile

| Aspect | PRD | Implemented | Status |
|--------|-----|-------------|--------|
| Demo button | ✅ Top right | ❌ None | Not done |
| Demo route | ✅ `/demo` | ❌ None | Not done |
| Demo user | ✅ 500 movies, 100 ratings | ❌ None | Not done |
| Demo profile UI | ✅ Full showcase | ❌ None | Not done |

**Verdict:** Completely unimplemented.

### 4. Route Protection

| Aspect | PRD | Implemented | Status |
|--------|-----|-------------|--------|
| Landing page `/` | Public | Public ✅ | Correct |
| Sign-in `/sign-in` | Public | Public ✅ | Correct |
| Sign-up `/sign-up` | Public | Public ✅ | Correct |
| Films `/films` | Protected | 🔴 **PUBLIC** | **BUG!** |
| App `/app` | Protected | Protected (partially) | Needs check |

**⚠️ CRITICAL BUG:** `/films` is marked as public in middleware, but should be protected!

---

## Blockers & Issues Found

### 🔴 Critical

1. **Middleware Bug:** `/films` should not be public
   - File: `apps/web/src/middleware.ts:6`
   - Impact: Unauthenticated users can browse films
   - Fix: Remove `/films` from `PUBLIC_PATHS`

2. **Lists Router References Non-existent Field:** `users.clerkId`
   - File: `apps/api/src/trpc/routers/lists.ts:9`
   - Impact: Lists feature broken
   - Fix: Change to `users.id` and remove Clerk references

### 🟡 Medium

3. **Inconsistent TMDB Endpoints:** No separate "now playing", "box office", "top rated"
   - Only generic `tmdbRouter.popularMovies` exists
   - PRD requires three separate endpoints
   - Decision: Keep generic or create specific endpoints?

4. **No Film Metadata Seeding:** Films table empty?
   - Need to verify database state
   - Should populate with TMDB data before Phase 2
   - Blocking: Demo profile, ratings, watchlists

5. **Username is Optional but Encouraged:** Sign-up form pushes username
   - PRD doesn't mention usernames
   - Current implementation makes it a key feature (generation, checking, suggestions)
   - Decision: Keep or make email-only as PRD specifies?

---

## Recommendations

### Keep (Working Well)

✅ **Auth system** — Secure, with good UX (password strength, username validation)  
✅ **Landing page design** — Modern, polished, better than PRD spec  
✅ **Films browser** — Advanced filtering/sorting (exceeds Phase 1, but good foundation)  
✅ **Middleware structure** — Handles routing correctly (once bug fixed)  
✅ **Tailwind + shadcn/ui** — Cohesive, professional design system  
✅ **Code organization** — Clear separation of concerns (routers, contexts, hooks)  

### Fix (Critical)

🔧 **Fix middleware bug** — Remove `/films` from public paths  
🔧 **Fix lists router** — Change `clerkId` to `id`  
🔧 **Create seed script** — Populate films table with TMDB data  

### Decide (Design Choices)

❓ **Username field** — Keep optional username or remove and go email-only?  
❓ **TMDB endpoints** — Create separate "now playing", "box office", "top rated" or keep generic?  
❓ **Demo profile** — Still needed for Phase 1, or move to Phase 2?  
❓ **Social login** — Implement GitHub/Google, or skip for MVP?  

### Add (Phase 1 Remaining)

📝 **Demo profile** — Create `/demo` route, seed data, UI  
📝 **Landing page lists** — Add separate endpoints for box office and top rated  
📝 **Cleanup** — Remove Clerk references, finalize schema  

---

## File Inventory

### Backend Files (Working)

- `apps/api/src/index.ts` ✅ Fastify setup
- `apps/api/src/trpc/router.ts` ✅ tRPC router
- `apps/api/src/trpc/context.ts` ✅ Context (JWT extraction)
- `apps/api/src/trpc/init.ts` ✅ Procedures (public/protected)
- `apps/api/src/trpc/routers/auth.ts` ✅ Auth (register, login, me, username)
- `apps/api/src/trpc/routers/films.ts` ✅ Film search/filter
- `apps/api/src/trpc/routers/tmdb.ts` ✅ TMDB popular movies
- `apps/api/src/trpc/routers/users.ts` ✅ User ratings
- `apps/api/src/trpc/routers/lists.ts` ⚠️ Broken (clerkId ref)
- `apps/api/src/lib/jwt.ts` ✅ JWT utilities
- `apps/api/src/lib/password.ts` ✅ Hashing
- `apps/api/src/lib/redis.ts` ✅ Cache
- `apps/api/src/lib/tmdb.ts` ✅ TMDB API client

### Frontend Files (Working)

- `apps/web/src/middleware.ts` 🔴 Bug (public paths)
- `apps/web/src/app/page.tsx` ✅ Landing page
- `apps/web/src/app/(auth)/sign-in/page.tsx` ✅ Login form
- `apps/web/src/app/(auth)/sign-up/page.tsx` ✅ Register form
- `apps/web/src/app/(main)/films/page.tsx` ✅ Films browser
- `apps/web/src/app/api/auth/register/route.ts` ✅ Register endpoint
- `apps/web/src/app/api/auth/login/route.ts` ✅ Login endpoint
- `apps/web/src/app/api/auth/logout/route.ts` ✅ Logout endpoint
- `apps/web/src/contexts/auth-context.tsx` ✅ Auth state
- `apps/web/src/lib/trpc/client.tsx` ✅ tRPC client
- `apps/web/src/lib/trpc/server.ts` ✅ Server-side tRPC
- `apps/web/src/lib/auth.ts` ✅ Auth utilities

### Components (Well-Organized)

- `film-card/` — Movie card component
- `filters/` — Faceted search, filters, sort chips
- `layout/` — Header, sidebar

### Database Schema

- `packages/db/src/schema/users.ts` ✅ Users table
- `packages/db/src/schema/films.ts` ✅ Films table (empty?)
- `packages/db/src/schema/ratings.ts` ✅ Ratings table
- `packages/db/src/schema/lists.ts` ✅ Lists + ListItems
- `packages/db/src/schema/streaming.ts` ✅ Streaming availability

---

## Next Steps

1. **Fix critical bugs** (middleware, lists router)
2. **Seed films data** into database
3. **Decide on design choices** (username, TMDB endpoints, demo profile)
4. **Update STORIES.md** if decisions change scope
5. **Create demo profile** if decided to include in Phase 1

---

**Reviewed By:** Audit performed May 24, 2026  
**Decision Needed By:** Before assigning Phase 2 stories

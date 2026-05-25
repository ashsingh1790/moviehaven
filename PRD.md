# MOVIE HAVEN - Product Requirements Document

**Last Updated:** May 24, 2026  
**Status:** High-Level PRD (In Development)

> **Note for AI Agents:** This document defines the full vision and scope of Movie Haven. Read this first to understand the big picture before tackling user stories. Each story will reference relevant sections here.

---

## 1. Executive Summary

**Movie Haven** is an intelligent film discovery platform that solves "what should I watch tonight" paralysis. Unlike streaming platforms that algorithmically push new mediocre content, Movie Haven understands *you*—your taste, your history, your moods—and delivers genuinely personalized recommendations backed by data and explained in natural language.

**Core Insight:** Users waste 20+ minutes deciding what to watch because streaming platforms optimize for *watch time* and *new content*, not *watch satisfaction*.

---

## 2. Problem Statement

- **Streaming service recommendations are poor**: They push new releases regardless of quality or user taste
- **Discovery is broken**: Users end up watching average Netflix originals instead of hidden gems matching their preferences
- **No context**: Recommendations don't account for watch history, ratings, or stated preferences
- **Lack of agency**: Users can't easily see *why* something is recommended or find alternatives that match their taste

---

## 3. Goals

1. **Enable confident viewing decisions** — Users see recommendations they understand and trust
2. **Reduce decision time** — From "what should I watch?" to selection in <2 minutes
3. **Improve watch satisfaction** — Recommend films that match user taste, not platform priorities
4. **Understand user taste deeply** — Build rich user profiles from activity (imports, ratings, reviews, watch history)
5. **Provide transparency** — Explain *why* a movie is recommended

---

## 4. Core Features by Phase

### **Phase 1: Landing Page & Authentication (MVP)**

#### Landing Page
- Hero: "Discover films the way you think about them" tagline with modern design
  - Large CTAs: "Browse all films" + "Create free account"
  - Modern aesthetic with gradient backgrounds and smooth transitions
- Below: three curated lists from TMDB
  - Current movies in theater (NOW_PLAYING endpoint)
  - Top movies by box office (TOP_REVENUE endpoint)
  - Top movies by IMDb rating (TOP_RATED endpoint)

#### Demo Button (Top Right)
- Routes to a **demo profile** showcasing a fake user with:
  - 500 sample movies in their database
  - 100 sample ratings across genres
  - Populated watchlist with diverse titles
  - Live recommendation engine in action
  - Filters and sorts working end-to-end
  - Sample reviews (public and private)
  - All feature examples functional

#### User Sign-Up & Authentication
- Email/password authentication with optional username
  - Username is optional, with real-time availability checking
  - Auto-suggest usernames if desired name is taken
  - Username generation button for convenience
- Social login (GitHub, Google) — TBD in Phase 2
- Minimal friction, quick onboarding path
- JWT-based auth (custom implementation with jose library)

---

### **Phase 2: Profile Builder & Data Import**

#### Profile Builder (AI-Guided Onboarding)
The smoothest experience possible—all steps skippable, built with available data.

Users select preferences for:
1. **Favorite Genres** → AI suggests top-rated movies in each
2. **Favorite Studios** (e.g., A24, Criterion) → AI suggests their top-rated films
3. **Favorite Actors** → AI suggests their filmography's top-rated films
4. **Favorite Decade** → AI suggests top-rated films from that era

**UX:** Each step is optional. Profile builder learns from user skips and selections to seed initial recommendations. After onboarding, profile can be edited anytime.

#### IMDb Import
- Step-by-step UI to help users:
  1. Export watchlist from IMDb (download CSV)
  2. Export ratings from IMDb (download CSV)
  3. Upload files to Movie Haven
- Movie Haven maps imports to internal database
- Validates and handles missing/duplicate entries gracefully

#### Personal Library Features
- **Create Watchlist** — Build custom lists (e.g., "80s Sci-Fi I Need to Watch", "Rainy Day Movies")
- **Rate Movies** — 1-10 scale (like IMDb)
- **Write Reviews** — Text-only reviews with ratings
  - Public (visible to other users) or Private
  - Auto-moderation: Automated scan for profanity and vulgar language (no manual review queue; flagged content is blocked from posting)
  - Similar to IMDb review system

---

### **Phase 3: Smart Filtering & Discovery**

#### Watchlist & Ratings Filters
Users can filter their personal library by:
- Genre
- Actors
- Director
- Country
- Streaming service availability (based on user's location)

#### Watchlist & Ratings Sorts
Users can sort by:
- IMDb rating
- Release year
- Date added to their list
- User's own rating

---

### **Phase 4: Personalized Recommendations**

#### Recommendation Engine (Hybrid ML + LLM)
**Architecture:**

1. **ML Backend** (Daily Batch Job)
   - Runs nightly to compute recommendations for all users
   - Collaborative filtering: "Users like you rated these movies highly"
   - Content-based filtering: "Movies similar to films you loved"
   - Weighted by: genre affinity, actor affinity, rating patterns, recency
   - Outputs: Top 50 ranked movies per user → stored in Redis cache
   - Update frequency: Daily (users see fresh recommendations the next time they log in)

2. **LLM Enhancement Layer** (Real-Time)
   - Takes top recommendation + user profile → generates natural language explanation
   - Example outputs:
     - "We think you'll love this because you rated 9 other sci-fi films 8+ and this hits similar themes"
     - "Based on your love of 90s indie dramas, we found this gem"
   - Uses LLM provider's prompt caching to minimize latency and cost
   - Explanations cached and periodically regenerated
   - **LLM Providers to Evaluate:** Anthropic (Claude), OpenAI, Google (Gemini)

#### Recommendation Display
- **Homepage Feed** — Personalized recommendations updated daily
- **Reasons Shown** — Each recommendation includes LLM-generated reasoning
- **Fallback for New Users** — Until enough data collected, show: curated lists + genres they selected in profile builder

**Implementation Details:**
See [LLM_INTEGRATION.md](./LLM_INTEGRATION.md) for detailed code examples, provider comparison, cost optimization, and testing strategies.

**Research Spikes Required:**
- **Spike 1.S2:** LLM Provider Evaluation (Claude vs. OpenAI vs. Gemini)
- **Spike 2.S1:** ML Recommendation Algorithm Selection
- **Spike 4.S1:** LLM Prompt Engineering for Recommendations

---

### **Phase 5: Production Readiness & Scaling**

#### Deployment & Infrastructure
- Deploy API to cost-effective hosting (Railway, Render, or Fly.io)
- Deploy web to Vercel (Next.js optimized, free tier available)
- Set up CI/CD pipeline (GitHub Actions)
- Configure environment variables and secrets management

#### Database & Caching
- PostgreSQL hosted on Neon (free tier for MVP, scales to production)
- Redis cache on Upstash (serverless Redis, pay-as-you-go)
- Database migrations and backup strategy

#### Monitoring & Observability
- Error tracking (Sentry)
- Performance monitoring (basic application metrics)
- Logging strategy (structured logs to Axiom or similar)
- Uptime monitoring (Better Stack or similar)

#### Security Hardening
- HTTPS enforcement
- CORS configuration
- Rate limiting review
- SQL injection prevention (already using Drizzle ORM)
- XSS prevention (Next.js built-in, CSP headers)
- CSRF protection for forms

#### Performance Optimization
- Code splitting and lazy loading
- Image optimization (Next.js Image component already used)
- Database query optimization (indexes verified)
- Cache strategies finalized
- CDN for static assets (Vercel handles this)

#### User Growth Preparation
- Email verification for signup (optional, Phase 5+)
- Password reset flow
- Account deletion/GDPR compliance
- Analytics integration (PostHog or Plausible)

#### Cost-Effective Tech Stack (Recommended)
| Component | Service | Pricing | Notes |
|-----------|---------|---------|-------|
| **Database** | Neon (PostgreSQL) | Free tier + $0.15/hour compute | Serverless, scales automatically |
| **Redis Cache** | Upstash | Free tier + pay-per-op | Perfect for small-to-medium apps |
| **API Server** | Railway or Render | Free tier + $0.05-0.10/hour | Docker-based, simple deployment |
| **Web Hosting** | Vercel | Free tier + $20/month (Pro) | Optimized for Next.js, fast by default |
| **Domain** | Namecheap | ~$9/year | Cheap and reliable |
| **Email** | SendGrid or Mailgun | Free tier (100/day) | For transactional emails |
| **Error Tracking** | Sentry | Free tier (5k errors/month) | Generous free tier |
| **Analytics** | Plausible | $9/month or self-host | Privacy-focused, cheap |

**Estimated Monthly Cost (MVP):**
- Neon: $0 (free tier) → $15-50 (scaling)
- Upstash: $0 (free tier) → $10-20 (scaling)
- Railway/Render: $0 (free tier) → $20-50 (scaling)
- Vercel: $0 (free tier) → $20 (Pro)
- Domain: $0.75/month
- Email: $0 (free tier)
- **Total: ~$50-100/month at scale** (vs. $500+ for traditional hosting)

#### Performance Targets
- API response time: <200ms (p95)
- Page load time: <2s (mobile, 3G)
- Lighthouse score: 90+ (all categories)
- Uptime: 99.5%
- Database response time: <50ms (p95)

---

## 5. Data Integration

### Streaming Availability
- Integrate with **all available APIs** for real-time streaming availability:
  - JustWatch API (primary)
  - TMDB API (fallback)
  - Regional detection based on user location
- Cache with ~24h TTL in Redis

### Film Metadata
- TMDB API for: title, plot, runtime, release date, cast, crew, genres, ratings, images
- IMDb integration for ratings and user reviews (for context, not display)

---

## 6. Technical Architecture Summary

**Recommendation Engine:**
- Daily nightly batch job (scheduler: cron or job queue)
- Computes ML scores for all unwatched movies for each user
- Stores top 50 candidates per user in Redis cache
- LLM explains top 10-15 candidates with prompt caching
- API endpoint returns pre-cached recommendations instantly (~100ms)

**User Data:**
- Watch history, ratings, reviews, lists → PostgreSQL (Drizzle ORM)
- Cached recommendations → Redis
- Streaming availability → Redis (24h TTL)

**Monorepo Structure:**
- `apps/api` — Fastify + tRPC (recommendation API endpoints, import handlers)
- `apps/web` — Next.js 15 (UI, demo profile, onboarding)
- `packages/db` — Drizzle ORM schema (add `recommendations` table for batch results)

---

## 7. Phased Rollout

| Phase | Scope | Timeline |
|---|---|---|
| **Phase 1** | Landing page, auth with username, demo profile (500 movies, 100 ratings), separate TMDB lists | Week 1-2 |
| **Phase 2** | Profile builder, IMDb import, ratings/reviews, watchlists, social auth (GitHub/Google) | Week 3-5 |
| **Phase 3** | Filters, sorts, advanced search | Week 6-7 |
| **Phase 4** | ML recommendation engine, LLM explanations, daily batch job | Week 8-10 |
| **Phase 5** | Production readiness, deployment, monitoring, scaling optimization | Week 11-12 |

---

## 8. Success Metrics

- **User Onboarding**: % of signups who complete at least one action (rate movie, create watchlist)
- **Engagement**: Avg time from login to selecting a recommendation
- **Satisfaction**: Click-through rate on recommendations; user ratings of recommended films
- **Retention**: Weekly active users, return rate after 1 week / 30 days
- **Recommendation Quality**: % of recommended films the user watches; avg rating of watched recommendations

---

## 9. Out of Scope (For Now)

- Social features (friend lists, shared watchlists, comments on reviews)
- Mobile app (web-first, responsive design only)
- Advanced filters (mood-based, visual similarity)
- Streaming subscription management / payment integration
- Offline mode
- Real-time collaborative watchlists
- Multi-language support (English only initially)

---

## 10. Decision Log

### Username Field in Authentication
**Decision:** Include optional username with real-time availability checking and generation  
**Rationale:** Improves UX by allowing memorable usernames; username generator and suggestions reduce friction.  
**Implementation:** Username is optional at signup; users can skip and use email-only.  
**Status:** ✅ Implemented

### Landing Page Tagline & Design
**Decision:** "Discover films the way you think about them" with modern gradient design  
**Rationale:** More compelling than generic "What should you watch tonight?" tagline. Modern design stands out.  
**Status:** ✅ Implemented

### TMDB List Endpoints
**Decision:** Create separate endpoints for NOW_PLAYING, TOP_REVENUE (box office), and TOP_RATED  
**Rationale:** Allows different caching strategies and user expectations for each list type.  
**Status:** Pending Phase 1 completion

### LLM Provider Evaluation
**Decision:** Evaluate Anthropic (Claude), OpenAI, and Google (Gemini)  
**Rationale:** Different pricing models, latency, and quality tradeoffs. Will benchmark before Phase 4.  
**Status:** Pending Phase 4 implementation

### Recommendation Update Frequency
**Decision:** Daily batch job (nightly)  
**Rationale:** Users should see fresh recommendations each time they return, without real-time latency.  
**Tradeoff:** ~24h delay for new user behavior to influence recommendations (acceptable for watch patterns)

### Demo Profile Data Scale
**Decision:** 500 movies, 100 ratings  
**Rationale:** Large enough to showcase recommendations and filters, small enough to not slow down demo load.

### Review Moderation
**Decision:** Automated scanning only (no manual review queue)  
**Rationale:** MVP constraint—no moderation bandwidth. Automated scan for profanity/vulgar language blocks flagged content.  
**Future:** Add manual review queue in Phase 5 if needed

### Social Authentication
**Decision:** Implement GitHub and Google OAuth in Phase 2  
**Rationale:** Reduces friction for users familiar with social login; Phase 1 focuses on email/password MVP.

### Profile Builder Timing
**Decision:** Phase 1 MVP (moved from Phase 2)  
**Rationale:** Needed for demo profile showcase; part of onboarding flow.

---

## 11. Getting Started (For Agents)

When implementing a user story:

1. **Find your story** in the Phase section above
2. **Understand the context** by reading the relevant feature section
3. **Check the architecture** (Section 6) for data flow and API structure
4. **Reference the monorepo structure** in CLAUDE.md for file paths
5. **Ask questions** if a story conflicts with this PRD

---

## 12. How to Update This Document

- Update **Decision Log** when major decisions change
- Update **Phased Rollout** timeline as you progress
- Update **Status** at the top when moving to a new phase
- Add **Known Issues** or **Blockers** section if problems arise
- Keep all sections current—agents rely on this being the source of truth

---

## 12. Research Spikes

**Purpose:** Before building complex features, run timeboxed (1-3 day) investigations to answer critical questions and reduce uncertainty.

**Spikes Needed Before Each Phase:**

**Phase 1 Spikes:**
- **Spike 1.S2:** Streaming Availability API Integration — Compare JustWatch vs. TMDB, determine region detection strategy

**Phase 2 Spikes:**
- **Spike 1.S3:** IMDb Data Import Strategy — Research export formats, ID mapping, bulk import performance

**Phase 4 Spikes:**
- **Spike 1.S2:** LLM Provider Evaluation — Compare Claude, OpenAI, Google; determine cost-effective strategy
- **Spike 2.S1:** ML Recommendation Algorithm Selection — Research & prototype collaborative filtering approaches
- **Spike 4.S1:** LLM Prompt Engineering — Develop and optimize prompts for high-quality explanations

**See [STORIES.md](./STORIES.md) for detailed spike acceptance criteria.**

---

## Appendix: Data Model Overview

### Core Tables (See `@movie-haven/db` for schema)

- **users** — User accounts, auth
- **films** — Movie metadata from TMDB
- **ratings** — User ratings (1-10)
- **reviews** — User reviews (text, public/private)
- **lists** — User watchlists
- **listItems** — Items in a watchlist
- **recommendations** — *(Phase 4)* ML scores + LLM explanations (daily batch output)
- **streamingAvailability** — *(Phase 4)* Cached availability per region

---

**Last Reviewed:** May 24, 2026  
**Next Review:** After Phase 1 completion  
**Owner:** Sanjeevani

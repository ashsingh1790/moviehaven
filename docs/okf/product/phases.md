---
type: "Product Doc"
title: "Delivery phases"
description: "The five-phase rollout from landing page to production scaling."
resource: "docs/STORIES.md"
timestamp: 2026-07-05T20:42:47.881Z
---

Movie Haven ships in five phases (see `docs/PRD.md` §7 and `docs/STORIES.md`).

1. Landing page, auth with username, demo profile, curated TMDB lists.
2. Profile builder, IMDb import, ratings/reviews, watchlists, social auth.
3. Filters, sorts, advanced search; streaming availability.
4. ML recommendation engine + LLM explanations on a daily batch job.
5. Production readiness: deployment, monitoring, security, GDPR export.

Phase 1 is ~80% complete. The OKF [export router](/api/export.md) supports the Phase-5 data-portability goal.

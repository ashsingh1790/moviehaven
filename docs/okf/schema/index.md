# Schema


## Documents

* [films table](films.md) - TMDB-sourced film metadata; the catalog every rating, list item, and streaming row points at.
* [list_items table](list-items.md) - Join rows placing a film into a list, with ordering and an optional note.
* [lists table](lists.md) - User-owned watchlists and custom lists; may be public or private.
* [ratings table](ratings.md) - A user's 0.5–10 score for a film, with an optional embedded review. One row per (user, film).
* [streaming_availability table](streaming-availability.md) - Cached per-country, per-platform streaming availability for a film (Phase 3+).
* [users table](users.md) - Registered accounts with custom JWT auth (email + bcrypt password hash, optional username).

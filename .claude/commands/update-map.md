---
description: Refresh the codebase map table in CLAUDE.md after structural changes (new packages, renames, new apps). Skip for cosmetic edits — only regenerate when the directory tree itself changed.
---

The user invoked `/update-map`. Refresh the codebase map in `CLAUDE.md`.

Procedure:
1. Read the `## Codebase map` section in `CLAUDE.md` and note what's currently listed.
2. Run `git log --oneline -20 -- ':(exclude)node_modules' ':(exclude)dist' ':(exclude).next'` to see recent structural changes.
3. Walk the top-level tree (`apps/`, `packages/`, `.claude/`) and compare against current map rows.
4. If nothing meaningful changed: tell the user the map is up to date and stop.
5. Otherwise, propose updated rows — one-line purpose per path, preserving existing descriptions where the directory didn't change.
6. Present the diff to the user before writing. Do not apply until approved.

Stop scope: the codebase map table only. Do not also restructure other sections of CLAUDE.md in the same turn.

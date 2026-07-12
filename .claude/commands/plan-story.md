---
description: Plan implementation for a user story from docs/STORIES.md. Reads the PRD for context, identifies affected files, and produces a step-by-step plan before any code is written.
---

The user invoked `/plan-story`. Plan the implementation of a story from Movie Haven's backlog.

Procedure:
1. Open `docs/STORIES.md` and locate the story the user named (or ask which one if not specified).
2. Open `docs/PRD.md` and read the relevant phase section for full feature context.
3. Read all files listed under "Affected Files" in the story, plus any files they import that are relevant.
4. Produce a step-by-step implementation plan:
   - List every file to create or modify with a one-line description of the change
   - Call out acceptance criteria that need tests written first (TDD)
   - Flag any dependency on another story that must be done first
   - Note any gotchas from `CLAUDE.md` that apply
5. Present the plan to the user for approval before writing any code.

Stop scope: planning only. Do not write implementation code or tests during this command.

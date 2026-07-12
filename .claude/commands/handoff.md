---
description: Capture session-specific handoff context as JSON for the next session
---

Produce a handoff context document so a fresh session can resume this work without losing what only exists in our conversation.

Rules:

1. Quote constraints VERBATIM from our conversation. Paraphrase = data loss. If I said "don't touch the auth middleware", write exactly that, not "be careful with auth".
2. Skip anything already in CLAUDE.md or re-readable from files — that reinjects automatically. Only capture session-specific state.
3. Include ruled-out approaches and WHY they were ruled out. This is the #1 thing that dies in normal compacts.
4. Output JSON only. No preamble, no trailing explanation. Save in the `./docs/handoff-context.json`

Schema:

```json
{
  "completed_tasks": [
    "one line each, concrete things finished in this session"
  ],
  "current_state": "where things stand right now — in-flight work, files modified, what's working, what's broken",
  "constraints_to_preserve": [
    "Quote verbatim. Cover: ruled-out approaches + why, user rules (don't do X, must do Y), technical constraints we discovered (module limits, API shapes, edge cases we hit)"
  ],
  "issues_discovered": [
    "bugs, gotchas, surprises found this session — and how we worked around them"
  ],
  "next_steps": [
    "ordered, specific. First thing the new session should do, then the next, etc."
  ]
}
```

# Agent setup

This is a deepsec scanning workspace. Each registered project has its
own setup prompt at `data/<id>/SETUP.md` — open the relevant one when
asked to set a project up.

## Common tasks

- **Set up a project for scanning**: read `data/<id>/SETUP.md` and
  follow it (read the curated skill below, then fill
  `data/<id>/INFO.md` from the target codebase).
- **Add a new project**: run `deepsec init-project <root>` — it
  scaffolds `data/<id>/` and prints/writes the setup prompt for the
  new project.
- **Write a custom matcher** (only after a real true-positive shows you
  a pattern worth keeping): read
  `node_modules/deepsec/dist/docs/writing-matchers.md`.

## Reference

Use the **curated deepsec skill** at
`/Users/sanjeevani/dev/AI_Projects/MovieHaven/.claude/skills/deepsec/SKILL.md`
in preference to the raw npm skill. It includes cost-safety guardrails,
calibration steps, and bundled helper scripts not present in the npm package.

The raw npm skill and full docs are at `node_modules/deepsec/SKILL.md`
and `node_modules/deepsec/dist/docs/` if you need internals.

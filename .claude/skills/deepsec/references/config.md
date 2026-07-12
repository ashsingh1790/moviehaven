# `deepsec.config.ts` reference

Deepsec walks up from cwd looking for `deepsec.config.{ts,mjs,js,cjs}`. The file is real TypeScript — module-level logic, imports, dynamic generation are all fine.

## Top-level shape

```ts
import { defineConfig, type DeepsecPlugin } from "deepsec/config";

export default defineConfig({
  projects: [
    {
      id: "my-app",            // also data/<id>/ dirname & --project-id value
      root: "..",              // path to repo root, relative to .deepsec/
      githubUrl: "https://github.com/me/my-app",  // auto-detected from git remote
      infoMarkdown: "...",     // OVERRIDES data/<id>/INFO.md if set — careful!
      promptAppend: "...",     // appended to every AI batch prompt
      priorityPaths: ["src/api"],   // process these files first
    },
  ],
  plugins: [],
  matchers: { only: [], exclude: [] },
  defaultAgent: "claude",
  dataDir: "./data",           // default
});
```

### `projects[]`

- `id` — kebab-case slug. Becomes `data/<id>/` dirname and the `--project-id` value.
- `root` — repo root, relative to the directory containing `deepsec.config.ts`. Usually `..` when `.deepsec/` lives inside the repo.
- `githubUrl` — auto-detected from `git remote -v`; explicit value wins.
- `infoMarkdown` — **overrides** `data/<id>/INFO.md`. If set, edits to the file are ignored. Footgun.
- `promptAppend` — appended verbatim to every AI prompt for this project. Use for project-specific instructions that shouldn't live in INFO.md (e.g. "this codebase uses CommonJS, not ESM").
- `priorityPaths` — file globs processed first. Useful when calibrating with `--limit` to ensure you see the most important findings first.

### `plugins[]`

Plugin order matters. Slots are either *additive* or *last-write-wins*:

- **Additive** (multiple plugins contribute): `matchers`, `notifiers`, `agents`
- **Last-wins** (one slot, last plugin sets it): `ownership`, `people`, `executor`

Inline plugin pattern is the most common — you don't usually need to publish plugins to npm:

```ts
const myPlugin: DeepsecPlugin = {
  name: "my-app",
  matchers: [myMatcher1, myMatcher2],
};
```

See `references/matchers.md` for the full pattern.

### `matchers`

Top-level filter applied after plugin matchers are aggregated:

- `matchers.only: string[]` — if set, *only* these slugs run. `exclude` is ignored.
- `matchers.exclude: string[]` — these slugs skipped.

CLI `--matchers a,b` overrides both for one invocation.

### `defaultAgent`

`"claude" | "codex"`. Sets the project-wide default. Still overridable per-command with `--agent`. **The deepsec docs disagree about what the implicit default is** (see SKILL.md gotcha) — set this explicitly to avoid surprises.

### `dataDir`

Defaults to `./data` (relative to config file). Override if you want state stored elsewhere — e.g. on a faster volume. Same as `DEEPSEC_DATA_ROOT` env var.

## Per-project overrides: `data/<id>/config.json`

A legacy override file. If present, it merges over the `projects[]` entry:

```json
{
  "priorityPaths": ["src/api/admin"],
  "promptAppend": "Treat any deserialization of user JSON as untrusted.",
  "ignorePaths": ["src/legacy/**", "vendor/**"]
}
```

`ignorePaths` only exists at this layer (not in the config file). Useful for permanently silencing files without polluting `deepsec.config.ts`.

## `infoMarkdown` precedence (footgun)

If `projects[i].infoMarkdown` is set in `deepsec.config.ts`, **the file `data/<i.id>/INFO.md` is ignored**. Users sometimes edit the file expecting changes to apply, and they don't. When debugging "why is the prompt context wrong", check the config first, then the file.

## Common config patterns

### Different agents per project

```ts
projects: [
  { id: "frontend", root: "../packages/web" },
  { id: "backend",  root: "../packages/api" },
],
plugins: [
  { name: "per-project-defaults", agents: { /* per-project agent map */ } },
],
```

### Generated INFO.md from a script

```ts
import { readFileSync } from "node:fs";

const baseInfo = readFileSync("./info-template.md", "utf-8");

export default defineConfig({
  projects: [{
    id: "my-app",
    root: "..",
    infoMarkdown: baseInfo + "\n\n## Generated\n" + buildSection(),
  }],
});
```

Once you go this route, the data-dir INFO.md is dead — document it.

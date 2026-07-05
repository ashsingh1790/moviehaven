import { serializeFrontmatter } from "./frontmatter";
import type { Concept, OkfBundle, OkfFiles } from "./types";

/** "list-items" / "list_items" -> "List items" (mirrors okf_convert.py humanize). */
export function humanize(name: string): string {
  const s = name.replace(/\.md$/, "").replace(/[_-]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function dirOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function baseOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

function renderConcept(concept: Concept): string {
  const body = concept.body.replace(/\s+$/, "");
  return `${serializeFrontmatter(concept.frontmatter)}\n${body}\n`;
}

/**
 * Build the full set of bundle files from concepts: one file per concept plus an
 * auto-generated `index.md` in every directory (root index carries
 * `okf_version: "0.1"`; sub-indexes carry no frontmatter, per the spec) and a
 * root `log.md`. Index layout matches okf_convert.py's `_write_indexes` so a
 * subsequent Python `reindex` is a no-op.
 */
export function buildBundle(bundle: OkfBundle): OkfFiles {
  const files: OkfFiles = {};

  // All directories that need an index.md (always includes the root "").
  const dirs = new Set<string>([""]);
  for (const concept of bundle.concepts) {
    files[concept.path] = renderConcept(concept);
    let dir = dirOf(concept.path);
    while (dir) {
      dirs.add(dir);
      dir = dirOf(dir);
    }
  }

  for (const dir of dirs) {
    const isRoot = dir === "";
    const prefix = isRoot ? "" : `${dir}/`;

    // Direct child concepts of this directory, sorted by filename.
    const concepts = bundle.concepts
      .filter(c => dirOf(c.path) === dir)
      .sort((a, b) => baseOf(a.path).localeCompare(baseOf(b.path)));

    // Direct child subdirectories (skip dotfiles), sorted.
    const subdirs = [...dirs]
      .filter(d => d !== dir && dirOf(d) === dir && !baseOf(d).startsWith("."))
      .sort((a, b) => baseOf(a).localeCompare(baseOf(b)));

    const lines: string[] = [];
    if (isRoot) lines.push('---\nokf_version: "0.1"\n---\n');
    lines.push(`# ${isRoot ? bundle.name : humanize(baseOf(dir))}\n`);

    if (subdirs.length > 0) {
      lines.push("\n## Subdirectories\n");
      for (const d of subdirs) {
        lines.push(`* [${humanize(baseOf(d))}](${baseOf(d)}/)`);
      }
    }
    if (concepts.length > 0) {
      lines.push("\n## Documents\n");
      for (const c of concepts) {
        const file = baseOf(c.path);
        const title = c.frontmatter.title ?? humanize(file);
        const desc = c.frontmatter.description?.trim();
        lines.push(`* [${title}](${file})${desc ? ` - ${desc}` : ""}`);
      }
    }

    files[`${prefix}index.md`] = `${lines.join("\n").replace(/\s+$/, "")}\n`;
  }

  files["log.md"] = renderLog(bundle.name, bundle.concepts.length);
  return files;
}

function renderLog(name: string, count: number): string {
  const today = new Date().toISOString().slice(0, 10);
  return `# Update Log\n\n## ${today}\n* **Initialization**: Generated ${count} concept document(s) into the \`${name}\` OKF bundle.\n`;
}

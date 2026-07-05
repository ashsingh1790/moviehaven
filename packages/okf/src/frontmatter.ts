import type { Frontmatter } from "./types";

/**
 * Frontmatter serialization that mirrors okf_convert.py's `emit_frontmatter`
 * byte-for-byte, so the Python `reindex`/`validate` tooling round-trips our
 * output cleanly. Known keys are emitted in spec order; strings are
 * double-quoted; `tags` is a flow list; `timestamp` is emitted bare.
 */
const KNOWN_ORDER: (keyof Frontmatter)[] = [
  "type",
  "title",
  "description",
  "resource",
  "tags",
  "timestamp",
];

const TAG_NEEDS_QUOTE = /[:#,[\]]/;

function yamlQuote(value: string): string {
  const s = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${s}"`;
}

export function serializeFrontmatter(fm: Frontmatter): string {
  const parts: string[] = ["---\n"];

  for (const key of KNOWN_ORDER) {
    const val = fm[key];
    // Skip empty/absent fields — only `type` is required and validated elsewhere.
    if (val === undefined || val === null || val === "") continue;

    if (key === "tags") {
      const tags = val as string[];
      if (tags.length === 0) continue;
      const inner = tags.map(t => (TAG_NEEDS_QUOTE.test(t) ? yamlQuote(t) : t)).join(", ");
      parts.push(`tags: [${inner}]\n`);
    } else if (key === "timestamp") {
      parts.push(`timestamp: ${val as string}\n`);
    } else {
      parts.push(`${key}: ${yamlQuote(val as string)}\n`);
    }
  }

  parts.push("---\n");
  return parts.join("");
}

/**
 * Minimal frontmatter reader used only by the validator — matches the semantics
 * of okf_convert.py's fallback parser (key: value + inline [a, b] lists). Returns
 * null when there is no parseable frontmatter block (mirrors an empty dict).
 */
export function parseFrontmatter(text: string): Record<string, string | string[]> | null {
  if (!text.startsWith("---")) return null;
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return null;

  const out: Record<string, string | string[]> = {};
  for (const raw of lines.slice(1, end)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes(":")) continue;
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      out[key] = val
        .slice(1, -1)
        .split(",")
        .map(v => v.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      out[key] = val.replace(/^['"]|['"]$/g, "");
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

import { parseFrontmatter } from "./frontmatter";
import type { OkfFiles, ValidationIssue, ValidationResult } from "./types";

const RESERVED = new Set(["index.md", "log.md"]);
const LINK_RE = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;

function baseOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

/** Return the markdown body with any leading frontmatter fence removed. */
function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return text;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") return lines.slice(i + 1).join("\n");
  }
  return text;
}

/**
 * Validate a set of bundle files against OKF v0.1 conformance. Mirrors
 * okf_convert.py's `cmd_validate`: a bundle is conformant iff every non-reserved
 * `.md` has parseable frontmatter with a non-empty `type`. Missing descriptions
 * and broken bundle links are warnings, not errors (the spec tolerates them).
 */
export function validateBundle(files: OkfFiles): ValidationResult {
  const issues: ValidationIssue[] = [];
  const conceptIds = new Set<string>();
  let conceptCount = 0;

  for (const [path, content] of Object.entries(files)) {
    if (!path.toLowerCase().endsWith(".md")) continue;
    const base = baseOf(path);

    if (RESERVED.has(base)) {
      // Only the bundle-root index.md may carry frontmatter (okf_version).
      if (base === "index.md" && path !== "index.md" && parseFrontmatter(content)) {
        issues.push({
          severity: "error",
          path,
          message: "index.md must not contain frontmatter (except bundle root)",
        });
      }
      continue;
    }

    conceptCount++;
    conceptIds.add(path.slice(0, -3));

    const fm = parseFrontmatter(content);
    if (!fm) {
      issues.push({ severity: "error", path, message: "missing or unparseable YAML frontmatter" });
      continue;
    }
    if (!String(fm.type ?? "").trim()) {
      issues.push({
        severity: "error",
        path,
        message: "frontmatter missing required non-empty `type`",
      });
    }
    if (!String(fm.description ?? "").trim()) {
      issues.push({ severity: "warning", path, message: "no `description` (recommended)" });
    }
  }

  // Broken bundle links (absolute /path.md not matching a concept) -> warning.
  for (const [path, content] of Object.entries(files)) {
    if (!path.toLowerCase().endsWith(".md") || RESERVED.has(baseOf(path))) continue;
    const body = stripFrontmatter(content);
    for (const match of body.matchAll(LINK_RE)) {
      const [, image, , rawUrl] = match;
      if (image || !rawUrl) continue; // image link or missing url
      const url = (rawUrl.split("#")[0] ?? "").trim();
      if (url.startsWith("/") && url.toLowerCase().endsWith(".md")) {
        if (!conceptIds.has(url.replace(/^\/+/, "").slice(0, -3))) {
          issues.push({ severity: "warning", path, message: `broken bundle link -> ${url}` });
        }
      }
    }
  }

  return {
    conformant: !issues.some(i => i.severity === "error"),
    conceptCount,
    issues,
  };
}

/** Human-readable one-line-per-issue report, matching the Python CLI's style. */
export function formatValidation(result: ValidationResult): string {
  const lines: string[] = [];
  for (const i of result.issues.filter(i => i.severity === "warning")) {
    lines.push(`warning: ${i.path}: ${i.message}`);
  }
  for (const i of result.issues.filter(i => i.severity === "error")) {
    lines.push(`ERROR:   ${i.path}: ${i.message}`);
  }
  const errors = result.issues.filter(i => i.severity === "error").length;
  const warnings = result.issues.filter(i => i.severity === "warning").length;
  lines.push(
    `\n${result.conceptCount} concept(s) checked; ${errors} error(s), ${warnings} warning(s).`,
  );
  lines.push(
    result.conformant
      ? "Result: CONFORMANT with OKF v0.1."
      : "Result: NOT CONFORMANT with OKF v0.1.",
  );
  return lines.join("\n");
}

/**
 * Open Knowledge Format (OKF) v0.1 primitives.
 * Spec: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
 *
 * The only required frontmatter field is `type`. Everything else is optional
 * polish, but `title` + `description` make a bundle far more navigable for an
 * agent reading index.md files first.
 */
export interface Frontmatter {
  /** Required, non-empty. The kind of concept (e.g. "DB Table", "Entity"). */
  type: string;
  title?: string;
  description?: string;
  /** Canonical URI of an external asset this concept describes. */
  resource?: string;
  tags?: string[];
  /** ISO 8601 timestamp of the last meaningful change. */
  timestamp?: string;
}

/**
 * A single concept document. `path` is bundle-relative with no leading slash
 * and ends in `.md` (e.g. "schema/films.md"); its concept id is the path minus
 * the extension ("schema/films").
 */
export interface Concept {
  path: string;
  frontmatter: Frontmatter;
  /** Markdown body — no frontmatter fence. */
  body: string;
}

export interface OkfBundle {
  /** Display name used as the root index.md heading and in log.md. */
  name: string;
  concepts: Concept[];
}

/** Map of bundle-relative path -> file contents, ready to write to disk or zip. */
export type OkfFiles = Record<string, string>;

export type Severity = "error" | "warning";

export interface ValidationIssue {
  severity: Severity;
  path: string;
  message: string;
}

export interface ValidationResult {
  conformant: boolean;
  conceptCount: number;
  issues: ValidationIssue[];
}

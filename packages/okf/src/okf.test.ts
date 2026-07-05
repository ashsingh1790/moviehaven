import { describe, expect, it } from "vitest";
import { buildBundle, serializeFrontmatter, validateBundle } from "./index";
import type { Concept } from "./types";

const concepts: Concept[] = [
  {
    path: "schema/films.md",
    frontmatter: { type: "DB Table", title: "films", description: "Film catalog." },
    body: "# films\n\nSee [users](/schema/users.md).",
  },
  {
    path: "schema/users.md",
    frontmatter: { type: "DB Table", title: "users", description: "Accounts." },
    body: "# users",
  },
];

describe("serializeFrontmatter", () => {
  it("quotes known string fields, emits tags as a flow list, and leaves timestamp bare", () => {
    const out = serializeFrontmatter({
      type: "DB Table",
      title: "films",
      tags: ["core", "with:colon"],
      timestamp: "2026-07-05T00:00:00.000Z",
    });
    expect(out).toContain('type: "DB Table"');
    expect(out).toContain('title: "films"');
    expect(out).toContain('tags: [core, "with:colon"]');
    expect(out).toContain("timestamp: 2026-07-05T00:00:00.000Z");
  });

  it("omits empty/absent optional fields", () => {
    const out = serializeFrontmatter({ type: "Entity", description: "" });
    expect(out).toBe('---\ntype: "Entity"\n---\n');
  });
});

describe("buildBundle", () => {
  const files = buildBundle({ name: "Test Bundle", concepts });

  it("writes a root index.md carrying okf_version and a log.md", () => {
    expect(files["index.md"]).toContain('okf_version: "0.1"');
    expect(files["index.md"]).toContain("# Test Bundle");
    expect(files["log.md"]).toContain("# Update Log");
  });

  it("writes sub-directory indexes WITHOUT frontmatter", () => {
    const schemaIndex = files["schema/index.md"];
    expect(schemaIndex).toBeDefined();
    expect(schemaIndex?.startsWith("---")).toBe(false);
    expect(schemaIndex).toContain("[films](films.md)");
  });

  it("emits each concept with its frontmatter and body", () => {
    expect(files["schema/films.md"]).toContain('type: "DB Table"');
    expect(files["schema/films.md"]).toContain("See [users](/schema/users.md).");
  });
});

describe("validateBundle", () => {
  it("passes a well-formed bundle with zero errors and warnings", () => {
    const result = validateBundle(buildBundle({ name: "Test", concepts }));
    expect(result.conformant).toBe(true);
    expect(result.conceptCount).toBe(2);
    expect(result.issues).toHaveLength(0);
  });

  it("flags a concept missing a non-empty type as an error", () => {
    const files = buildBundle({
      name: "Test",
      concepts: [{ path: "a.md", frontmatter: { type: "" }, body: "body" }],
    });
    const result = validateBundle(files);
    expect(result.conformant).toBe(false);
    expect(result.issues.some(i => i.severity === "error")).toBe(true);
  });

  it("warns (not errors) on a broken bundle link", () => {
    const files = buildBundle({
      name: "Test",
      concepts: [
        {
          path: "a.md",
          frontmatter: { type: "Entity", description: "x" },
          body: "See [ghost](/missing.md).",
        },
      ],
    });
    const result = validateBundle(files);
    expect(result.conformant).toBe(true);
    expect(result.issues.some(i => i.severity === "warning" && i.message.includes("broken"))).toBe(
      true,
    );
  });
});

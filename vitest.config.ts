import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Workspace discovery: each glob match becomes its own Vitest project,
    // using that directory's own vitest config if present, or sane defaults
    // otherwise. This is how new packages/apps get test discovery for free
    // without touching this file again.
    projects: ["packages/*", "apps/*"],
    // Most packages/apps have no tests yet — don't fail the run for that.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/*.config.*"],
      // Coverage targets from docs/TESTING.md — NOT enforced as hard thresholds
      // yet. The repo has almost no tests today; a hard `thresholds` block here
      // would make CI permanently red. Wire the provider + `test:coverage`
      // script now, ratchet up real `thresholds` once coverage catches up.
      //   Auth                 90%
      //   Recommendations      85%
      //   Films API            80%
      //   Utils                60%
      //   UI Components        70%
      //   Overall              80%
    },
  },
});

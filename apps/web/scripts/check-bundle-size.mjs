#!/usr/bin/env node
/**
 * Bundle size budget check (ratcheting budget).
 *
 * Run after `next build`. Reads `.next/app-build-manifest.json` and, for each
 * key route, sums the gzipped size of every client JS chunk the manifest lists
 * for the route's page + its layouts. Fails (exit 1) if any route exceeds its
 * budget.
 *
 * Methodology: this is the union of all manifest-listed JS for the route — a
 * superset of the "First Load JS" figure `next build` prints (which excludes
 * chunks it considers lazily loaded). The number is deterministic across runs
 * of the same build, which is what a ratcheting budget needs.
 *
 * Ratcheting philosophy: budgets are set from the measured baseline +10%
 * headroom. When a legitimate feature raises a route past its budget, raise
 * the budget consciously in the same PR — never silently.
 *
 * Baselines re-measured 2026-07-10 after the main-branch merge bumped
 * `next` ^15.3.0 -> ^15.5.18 (resolves 15.5.20), gzip level 9:
 *   /        173.6 KiB  (was 174.7 KiB on Next 15.5.15)
 *   /films   226.5 KiB  (was 227.2 KiB on Next 15.5.15)
 *   /sign-in 170.9 KiB  (was 172.0 KiB on Next 15.5.15)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(webRoot, ".next");

/** Budget per route in KiB (gzipped). Measured baseline +10% headroom. */
const BUDGETS_KIB = {
  "/": 191,
  "/films": 249,
  "/sign-in": 188,
};

/** Manifest entries (page + ancestor layouts) that make up each route. */
const ROUTE_MANIFEST_KEYS = {
  "/": ["/layout", "/page"],
  "/films": ["/layout", "/(main)/films/layout", "/(main)/films/page"],
  "/sign-in": ["/layout", "/(auth)/sign-in/page"],
};

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(nextDir, "app-build-manifest.json"), "utf8")).pages;
} catch (err) {
  console.error(`Could not read ${join(nextDir, "app-build-manifest.json")}: ${err.message}`);
  console.error("Run `pnpm --filter @movie-haven/web build` first.");
  process.exit(1);
}

function gzippedRouteSizeBytes(manifestKeys) {
  const files = new Set();
  for (const key of manifestKeys) {
    const entries = manifest[key];
    if (!entries) {
      console.error(`Manifest key "${key}" not found in app-build-manifest.json.`);
      console.error("The route structure changed — update ROUTE_MANIFEST_KEYS in this script.");
      process.exit(1);
    }
    for (const file of entries) {
      if (file.endsWith(".js")) files.add(file);
    }
  }
  let total = 0;
  for (const file of files) {
    total += gzipSync(readFileSync(join(nextDir, file)), { level: 9 }).length;
  }
  return total;
}

let failed = false;
console.log("Bundle size budget check (gzipped client JS per route):\n");
for (const [route, keys] of Object.entries(ROUTE_MANIFEST_KEYS)) {
  const sizeKib = gzippedRouteSizeBytes(keys) / 1024;
  const budgetKib = BUDGETS_KIB[route];
  const ok = sizeKib <= budgetKib;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${route.padEnd(10)} ${sizeKib.toFixed(1).padStart(7)} KiB` +
      `  (budget ${budgetKib} KiB)`,
  );
}

if (failed) {
  console.error(
    "\nBudget exceeded. Either shrink the bundle (check `pnpm --filter @movie-haven/web analyze`)" +
      "\nor consciously raise the budget in apps/web/scripts/check-bundle-size.mjs and justify it in the PR.",
  );
  process.exit(1);
}
console.log("\nAll routes within budget.");

import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "api", root: "../apps/api" },
    { id: "web", root: "../apps/web" },
    // <deepsec:projects-insert-above>
  ],
});

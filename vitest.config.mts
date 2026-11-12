import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Keep Playwright's browser tests out of Vitest
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
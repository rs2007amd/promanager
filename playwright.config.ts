import { defineConfig } from "@playwright/test";

// Only look for browser tests in the e2e folder.
// Unit tests (*.test.ts, run by Vitest) live elsewhere and must be ignored.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
});
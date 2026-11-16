import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser using PayDesk the way a person would.
 *
 * Locally they reuse the dev server if one is already running on port 3000,
 * rather than starting a second one against the same .next folder. In CI they
 * run against a production build.
 */
const PORT = 3000;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // A dev server compiles each page on its first visit, so allow it longer
  timeout: isCI ? 60_000 : 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  workers: 2,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});

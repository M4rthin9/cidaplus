import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. SPEC.md §12 and CLAUDE.md both name `pnpm test:e2e`.
 *
 * These drive the real app against a real Postgres, because the flows worth
 * covering here are exactly the ones a unit test cannot see: a Server Action
 * writing a row, `revalidatePath` clearing the right cache entry, and the
 * public page then serving the change. Everything that can be checked without
 * a browser stays in the vitest suite.
 *
 * Prerequisites — the same state CI's job already produces:
 *   pnpm db:migrate && pnpm db:seed && pnpm build
 * `globalSetup` bootstraps the admin account the admin specs sign in with.
 */

const PORT = Number(process.env.E2E_PORT ?? 3000);
export const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Playwright 1.57 expects Chromium build 1200 and this dev image ships 1194, so
 * the browser is passed in explicitly when `E2E_CHROMIUM_PATH` is set. Leave it
 * unset anywhere with a normal `playwright install` and resolution is default.
 */
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  /**
   * Serial. The specs sign in as the one admin and mutate shared catalog rows;
   * running them in parallel would make failures depend on interleaving, which
   * is the kind of flake that gets a suite switched off rather than fixed.
   */
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
    /** Thai is the unprefixed default locale (§14 decision 21). */
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      /** The mobile specs assert on layout that only exists below the md breakpoint. */
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, isMobile: false },
      testMatch: /mobile\.spec\.ts/,
    },
  ],

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  webServer: {
    command: "pnpm start",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

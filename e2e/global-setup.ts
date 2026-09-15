import { spawnSync } from "node:child_process";

/**
 * Bootstrap the admin the admin specs sign in as.
 *
 * This shells out to `scripts/create-admin.ts` rather than reimplementing the
 * insert, so the suite exercises the same bootstrap path the RUNBOOK documents
 * — and that script is idempotent by design: re-running it resets the password
 * and clears any lockout, which is exactly what a repeated test run needs.
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e@cidapt.test";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2ePassw0rd!cidaplus";

export default function globalSetup() {
  const result = spawnSync(
    "node",
    [
      "node_modules/tsx/dist/cli.mjs",
      "--env-file-if-exists=.env",
      "scripts/create-admin.ts",
      ADMIN_EMAIL,
      "ผู้ดูแลระบบสำหรับทดสอบ",
      "owner",
    ],
    { env: { ...process.env, ADMIN_PASSWORD }, encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(
      `could not bootstrap the e2e admin — is the database migrated?\n${result.stderr ?? ""}`,
    );
  }
}

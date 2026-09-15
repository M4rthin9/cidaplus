import { spawnSync } from "node:child_process";

/**
 * Remove what the suite created.
 *
 * Every row the specs insert carries an `e2e-` slug, which is what makes this
 * safe against a seeded development database: it deletes by that prefix and
 * nothing else. Children cascade from `posts` and `products`, so deleting the
 * parent is enough — the same property the seed relies on.
 *
 * Failures are reported but never fail the run: leftover test rows are untidy,
 * not a reason to call a passing suite red.
 */
export default function globalTeardown() {
  const result = spawnSync(
    "node",
    ["node_modules/tsx/dist/cli.mjs", "--env-file-if-exists=.env", "e2e/cleanup.ts"],
    { env: process.env, encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.warn(`[e2e] could not clean up test rows: ${result.stderr?.trim() ?? ""}`);
  }
}

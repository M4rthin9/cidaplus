import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// The normal Docker/CI build is unchanged. A design preview is explicitly opt-in.
const entry =
  process.env.CIDA_PREVIEW === "1"
    ? "scripts/build-preview.mjs"
    : require.resolve("next/dist/bin/next");
const args = process.env.CIDA_PREVIEW === "1" ? [] : ["build"];
const result = spawnSync(process.execPath, [entry, ...args], {
  stdio: "inherit",
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

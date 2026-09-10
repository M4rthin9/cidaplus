import { createRequire } from "node:module";
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
// Reuse the pinned tools already provided by tsx and @tailwindcss/postcss.
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind = require("@tailwindcss/postcss");
const root = resolve(import.meta.dirname, "..");
const output = join(root, "out");
const temporary = join(root, "build", "design-preview");
await mkdir(output, { recursive: true });
await mkdir(temporary, { recursive: true });
const alias = { "@/i18n/navigation": join(root, "preview/navigation.tsx") };
const common = {
  absWorkingDir: root,
  bundle: true,
  alias,
  jsx: "automatic",
  tsconfig: join(root, "tsconfig.json"),
  logLevel: "warning",
  define: { "process.env.NODE_ENV": '"production"' },
};
await build({
  ...common,
  entryPoints: ["preview/render.tsx"],
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: join(temporary, "render.mjs"),
});
await build({
  ...common,
  entryPoints: ["preview/client.tsx"],
  platform: "browser",
  format: "esm",
  target: ["es2022"],
  minify: true,
  outfile: join(output, "preview.js"),
});
const css = await postcss([tailwind({ base: root, optimize: true })]).process(
  await readFile(join(root, "src/app/globals.css"), "utf8"),
  { from: join(root, "src/app/globals.css") },
);
await writeFile(
  join(output, "preview.css"),
  css.css + (await readFile(join(root, "preview/preview.css"), "utf8")),
);
for (const folder of ["fonts", "brand", "images"])
  await cp(join(root, "public", folder), join(output, folder), { recursive: true });
// The original 7.5 MB master is not a runtime asset.
await rm(join(output, "brand/cida-logo.png"), { force: true });
await cp(join(root, "public/favicon.ico"), join(output, "favicon.ico"));
const { render, routes } = await import(pathToFileURL(join(temporary, "render.mjs")).href);
for (const route of routes) {
  const directory = join(output, route);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), render(route));
}
await writeFile(join(output, "404.html"), render("/not-found"));
await writeFile(join(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
await writeFile(
  join(output, "_headers"),
  "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n",
);
console.log(
  `Built ${routes.length} storefront preview pages from shared components. No database, authentication, or enquiry actions are bundled.`,
);

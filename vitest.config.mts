import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  /**
   * Next requires `jsx: "preserve"` in tsconfig, and Vite refuses to transform
   * .tsx under that setting. Vite 8 transforms with Oxc rather than esbuild, so
   * the override goes under `oxc`. Test transform only; the app build is
   * untouched.
   */
  oxc: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // See test/server-only-stub.ts
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
});

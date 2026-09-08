import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The VPS is 6 GB / 4 cores; a standalone bundle keeps the runtime image small
  // and lets `docker compose pull` replace the app without a rebuild on the box.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    /**
     * Server Actions buffer the whole request body, and Next caps it at 1 MB by
     * default — which silently swallowed every real photo upload, since §13 caps
     * a file at 10 MB. This allows two max-size files in one batch; the
     * per-file limit is still enforced in the pipeline, and the upload form
     * refuses an oversized batch client-side so the failure is never silent.
     */
    serverActions: { bodySizeLimit: "24mb" },
  },
  images: {
    // No hotlinked assets (CLAUDE.md): every image is local or in the media library.
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);

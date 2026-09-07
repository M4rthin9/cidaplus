import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The VPS is 6 GB / 4 cores; a standalone bundle keeps the runtime image small
  // and lets `docker compose pull` replace the app without a rebuild on the box.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // No hotlinked assets (CLAUDE.md): every image is local or in the media library.
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

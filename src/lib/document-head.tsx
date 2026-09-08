import type { Viewport } from "next";

/**
 * The pieces both root layouts need. There are two of them — the storefront's
 * lives at `[locale]/layout.tsx` so `<html lang>` is a static route param, and
 * the admin has its own — and duplicating this by hand is how the two would
 * drift apart.
 */
export const sharedViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Self-hosted, subset and preloaded — no Google Fonts CDN (SPEC.md §2,
 * docs/DESIGN.md). Only the Thai face is preloaded: it carries the text that
 * renders first, and preloading both would compete with the LCP image.
 */
export function FontPreload() {
  return (
    <link
      rel="preload"
      href="/fonts/anuphan-thai.woff2"
      as="font"
      type="font/woff2"
      crossOrigin="anonymous"
    />
  );
}

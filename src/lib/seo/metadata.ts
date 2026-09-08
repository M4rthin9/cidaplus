import "server-only";

import type { Metadata } from "next";
import { assertEnv } from "@/lib/env";
import { DERIVATIVE_WIDTHS } from "@/lib/media/constants";
import { derivativeName, mediaUrl } from "@/lib/media/urls";
import { getCachedSetting } from "@/lib/settings/cached";
import { buildAlternates, type LocalePaths } from "./alternates";

/** The site-wide fallback preview image (docs/DESIGN.md). */
export const DEFAULT_OG_IMAGE = "/brand/og-default.png";
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * The largest rendition that actually exists for this file.
 *
 * The pipeline never upscales past the source width (phase 3), so a 420px
 * upload has only the 400px derivative — asking for 1600 would put a URL that
 * 404s into every OG card and into the `Product` node's `image`, which is
 * exactly the field a rich-result validator fetches.
 */
export function ogImageForStorageKey(storageKey: string, sourceWidth?: number | null): string {
  const widths = [...DERIVATIVE_WIDTHS].sort((a, b) => b - a);
  const available = sourceWidth ? widths.find((w) => w <= sourceWidth) : undefined;
  const width = available ?? widths[widths.length - 1] ?? 400;
  return mediaUrl(storageKey, derivativeName(width, "jpeg"));
}

/**
 * Metadata common to every public page: canonical, reciprocal hreflang, and an
 * Open Graph card. SPEC.md §10.
 *
 * The image falls back to the site default rather than being omitted — a link
 * with no preview image is the one a forwarded LINE message renders as a bare
 * URL, and LINE is this site's main distribution path.
 */
export async function publicMetadata(input: {
  locale: string;
  paths: LocalePaths | string;
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: Date | null;
}): Promise<Metadata> {
  const base = assertEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const general = await getCachedSetting("general", input.locale);
  const alternates = await buildAlternates(input.locale, input.paths);

  const image = `${base}${input.image ?? DEFAULT_OG_IMAGE}`;

  return {
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
    alternates,
    openGraph: {
      type: input.type ?? "website",
      siteName: general.siteName,
      locale: input.locale,
      url: alternates?.canonical?.toString(),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      images: [{ url: image, width: OG_WIDTH, height: OG_HEIGHT }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime.toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      images: [image],
    },
  };
}

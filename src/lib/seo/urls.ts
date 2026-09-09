import { DEFAULT_LOCALE, localePrefix } from "@/lib/slug";

/**
 * Absolute URLs for metadata. SPEC.md §10.
 *
 * Canonical tags, hreflang alternates, the sitemap and JSON-LD all have to be
 * absolute, and all four have to agree — a canonical that disagrees with the
 * sitemap is worse than neither. This is the one place the site's origin and
 * the locale prefix rule (§14 decision 21) are combined.
 */
export function siteOrigin(base: string): string {
  // Trailing slashes make every joined URL double-slashed.
  return base.replace(/\/+$/, "");
}

export function absoluteUrl(base: string, locale: string, path: string): string {
  const suffix = path === "/" ? "" : path;
  return `${siteOrigin(base)}${localePrefix(locale)}${suffix}`;
}

/** Percent-encode each segment; slugs are Thai UTF-8 (§14 decision 17). */
export function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => (segment === "" ? "" : encodeURIComponent(segment)))
    .join("/");
}

export { DEFAULT_LOCALE };

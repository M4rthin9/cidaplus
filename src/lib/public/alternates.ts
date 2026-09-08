import "server-only";

import { alternateSlugs } from "./queries";

/**
 * The equivalent path in every locale for the page currently being rendered.
 *
 * SPEC.md §5: "the switcher maps to the equivalent slug in the target locale —
 * never back to the homepage." Only three route shapes carry a per-locale slug;
 * every other public path is locale-independent and maps to itself.
 *
 * The pathname arrives without a locale prefix, which is what next-intl's `Link`
 * expects back.
 */
const SLUGGED = [
  { prefix: "/product/", kind: "product" as const },
  { prefix: "/category/", kind: "category" as const },
  { prefix: "/news/", kind: "news" as const },
];

/** Strip the locale prefix the middleware may have added. */
export function withoutLocalePrefix(pathname: string, locales: readonly string[]): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export async function alternatePaths(
  pathname: string,
  locale: string,
): Promise<Record<string, string> | undefined> {
  for (const route of SLUGGED) {
    if (!pathname.startsWith(route.prefix)) continue;

    const rest = pathname.slice(route.prefix.length);
    // `/news/` also serves the index; a nested path is not an entity slug.
    if (rest.length === 0 || rest.includes("/")) return undefined;

    const slugs = await alternateSlugs(route.kind, decodeURIComponent(rest), locale);
    const entries = Object.entries(slugs).map(([code, slug]) => [
      code,
      `${route.prefix}${encodeURIComponent(slug)}`,
    ]);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  return undefined;
}

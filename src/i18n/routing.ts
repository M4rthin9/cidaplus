import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE } from "@/lib/slug";

/**
 * Locale routing. SPEC.md §5, §14 decision 9.
 *
 * The list here is every locale the *routing* knows how to shape a URL for, not
 * the set that is switched on. Enablement lives in the `locales` table, because
 * "adding a language is a row insert, not a migration" (§6) — and this file
 * cannot read it: the middleware runs on the edge runtime with no database
 * driver. So `[locale]/layout.tsx` does the enablement check and 404s a locale
 * whose row is disabled, which is what keeps `/en/...` dark until a translator
 * is assigned.
 *
 * `localePrefix: "as-needed"` — Thai is served unprefixed and other locales are
 * prefixed. §5 says "all public routes are locale-prefixed", but that cannot be
 * adopted now: `localePrefix()` in `src/lib/slug.ts` has returned "" for Thai
 * since phase 4, and every 301 row `recordSlugRedirect` has written points at
 * that shape. §5's own site map also lists `/contact` unprefixed. Prefixing Thai
 * today would invalidate the stored redirects and put `/th` in front of every
 * URL on a site that ships one language; leaving it off means Thai URLs do not
 * change on the day English is switched on. Recorded as §14 decision 21.
 */
export const LOCALES = ["th", "en", "zh-Hans"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Off on purpose. With detection on, next-intl reads Accept-Language and would
 * redirect an English-preferring visitor from `/` to `/en` — which the layout
 * then 404s, because `en` is disabled. A Thai government site must not 404 for
 * anyone whose browser is set to English. Turn this on in the same change that
 * enables a second locale; §5's Accept-Language routing is unreachable until
 * there is more than one locale to route between.
 */
const LOCALE_DETECTION = false;

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: LOCALE_DETECTION,
});

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

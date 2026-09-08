import "server-only";

import type { Metadata } from "next";
import { assertEnv } from "@/lib/env";
import { enabledLocales } from "@/lib/public/locales";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { absoluteUrl, encodePath } from "./urls";

/**
 * Canonical + hreflang for one page. SPEC.md §10:
 *
 *   "Every page carries reciprocal `<link rel="alternate">` tags — a one-way
 *    hreflang is ignored by Google."
 *
 * Reciprocity comes from generating every locale's URL from the same map on
 * every page, so page A's list of alternates and page B's are the same list.
 *
 * Only **enabled** locales appear. Emitting an alternate for a locale whose
 * `locales` row is switched off would point search engines at a 404 — §14
 * decision 9 keeps `en` and `zh-Hans` dark, and the alternates have to agree
 * with that rather than with the routing table.
 *
 * `x-default` points at Thai, which is the site's default locale and the only
 * one guaranteed to have content (§6: Thai is the fallback for every locale).
 */
export type LocalePaths = Record<string, string>;

export async function buildAlternates(
  locale: string,
  paths: LocalePaths | string,
): Promise<Metadata["alternates"]> {
  const base = assertEnv().NEXT_PUBLIC_SITE_URL;
  const locales = await enabledLocales();

  const pathFor = (code: string): string => {
    if (typeof paths === "string") return paths;
    // A locale with no translation serves the fallback's slug, so it gets the
    // fallback's path rather than being dropped from the alternate set.
    return paths[code] ?? paths[DEFAULT_LOCALE] ?? "/";
  };

  const languages: Record<string, string> = {};
  for (const entry of locales) {
    languages[entry.code] = absoluteUrl(base, entry.code, encodePath(pathFor(entry.code)));
  }

  const defaultPath = pathFor(DEFAULT_LOCALE);
  if (locales.some((l) => l.code === DEFAULT_LOCALE)) {
    languages["x-default"] = absoluteUrl(base, DEFAULT_LOCALE, encodePath(defaultPath));
  }

  return {
    canonical: absoluteUrl(base, locale, encodePath(pathFor(locale))),
    languages,
  };
}

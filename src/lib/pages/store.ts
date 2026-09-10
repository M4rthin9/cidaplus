import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { pageI18n, pages } from "@/db/schema";
import { FALLBACK_LOCALE, resolveTranslation } from "@/db/i18n";
import { sanitizeSections, type SectionsValue } from "@/lib/sections/schema";

/**
 * Pages and their section arrays. SPEC.md §5, §6.
 *
 * `pages.key` is the stable handle (`home`, `about`, …) and the slug is
 * per-locale, so the homepage is looked up by key and every other page by slug.
 */
export const HOME_PAGE_KEY = "home";

export type PageContent = {
  id: string;
  key: string;
  title: string;
  slug: string;
  sections: SectionsValue;
  seoTitle: string | null;
  seoDescription: string | null;
};

function localeSet(locale: string): string[] {
  return locale === FALLBACK_LOCALE ? [FALLBACK_LOCALE] : [locale, FALLBACK_LOCALE];
}

async function contentFrom(
  rows: {
    id: string;
    key: string;
    locale: string;
    title: string;
    slug: string;
    sections: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
  }[],
  locale: string,
): Promise<PageContent | null> {
  const hit = resolveTranslation(rows, locale);
  if (!hit) return null;

  return {
    id: hit.row.id,
    key: hit.row.key,
    title: hit.row.title,
    slug: hit.row.slug,
    // Rebuilt on read as well as on write: a row written by an older version of
    // the app must not be able to take a page down.
    sections: sanitizeSections(hit.row.sections),
    seoTitle: hit.row.seoTitle,
    seoDescription: hit.row.seoDescription,
  };
}

const SELECT = {
  id: pages.id,
  key: pages.key,
  locale: pageI18n.locale,
  title: pageI18n.title,
  slug: pageI18n.slug,
  sections: pageI18n.sections,
  seoTitle: pageI18n.seoTitle,
  seoDescription: pageI18n.seoDescription,
} as const;

/** A published page by its stable key. Returns null when unpublished or absent. */
export async function getPageByKey(key: string, locale: string): Promise<PageContent | null> {
  try {
    const rows = await db
      .select(SELECT)
      .from(pages)
      .innerJoin(pageI18n, eq(pageI18n.pageId, pages.id))
      .where(
        and(
          eq(pages.key, key),
          eq(pages.isPublished, true),
          inArray(pageI18n.locale, localeSet(locale)),
        ),
      );

    return contentFrom(rows, locale);
  } catch {
    // Same posture as the settings read: a page that cannot load falls back to
    // the default composition rather than 500-ing the site's front door.
    return null;
  }
}

/** A published page by its per-locale slug, for the CMS-managed static routes. */
export async function getPageBySlug(slug: string, locale: string): Promise<PageContent | null> {
  const match = await db
    .select({ pageId: pageI18n.pageId, locale: pageI18n.locale })
    .from(pageI18n)
    .innerJoin(pages, eq(pages.id, pageI18n.pageId))
    .where(
      and(
        eq(pageI18n.slug, slug),
        eq(pages.isPublished, true),
        inArray(pageI18n.locale, localeSet(locale)),
      ),
    );

  const hit = resolveTranslation(match, locale);
  if (!hit) return null;

  const rows = await db
    .select(SELECT)
    .from(pages)
    .innerJoin(pageI18n, eq(pageI18n.pageId, pages.id))
    .where(and(eq(pages.id, hit.row.pageId), inArray(pageI18n.locale, localeSet(locale))));

  return contentFrom(rows, locale);
}

/**
 * What the homepage renders when no `home` page row exists — which is the state
 * of a fresh deployment, and was the hard-coded composition through phase 8.
 *
 * Keeping it means the site is never blank because nobody has opened the admin
 * yet, and it doubles as the starting point the editor offers when the operator
 * creates the page for the first time.
 */
export { defaultHomeSections } from "./default-home";

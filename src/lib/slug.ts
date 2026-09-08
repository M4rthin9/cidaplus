/**
 * Slugs. SPEC.md §9 and §14 decision 17.
 *
 * Slugs are Thai UTF-8, generated from the title. §9 asked for machine
 * transliteration, but Romanising Thai to the quality of §7's hand-written
 * `puangreed-baengpan` needs dictionary-based word segmentation — Thai has no
 * spaces between words — and a character-level mapping produces a permanent URL
 * nobody would choose. §6's own example is already a Thai slug, Google indexes
 * and displays UTF-8 paths decoded, and slugs are per-locale so enabling English
 * later gives it clean Latin independently.
 */

/** Thai block, including digits and the repetition mark. */
const THAI = "฀-๿";

/** Slugs are stored in varchar(255); keep well under it so suffixes always fit. */
export const MAX_SLUG_LENGTH = 120;

/**
 * Title -> slug. Keeps Thai and ASCII alphanumerics, turns any run of
 * separators into a single hyphen, and drops everything else.
 */
export function slugify(input: string): string {
  const normalised = input
    .normalize("NFC")
    .toLowerCase()
    // U+200B ZERO WIDTH SPACE marks a word boundary in Thai, which has no
    // spaces between words — keep it as a separator so the slug stays readable.
    .replace(/\u200B/g, " ")
    // ZWNJ, ZWJ and the BOM carry no boundary meaning and would be invisible
    // inside a URL, so they are removed outright.
    .replace(/[\u200C\u200D\uFEFF]/g, "");

  const kept = normalised.replace(new RegExp(`[^a-z0-9${THAI}]+`, "g"), "-");

  return kept.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, MAX_SLUG_LENGTH).replace(/-$/, "");
}

/**
 * A slug that is always non-empty. A title of only punctuation or emoji would
 * otherwise produce "", which is not a URL.
 */
export function slugifyWithFallback(input: string, fallbackSeed: string): string {
  const slug = slugify(input);
  if (slug.length > 0) return slug;
  return `item-${
    fallbackSeed
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 8)
      .toLowerCase() || "1"
  }`;
}

/**
 * Append -2, -3 … until `isTaken` says no. The caller supplies the predicate so
 * this stays pure and the uniqueness scope (per locale, per entity) lives with
 * the query rather than here.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  limit = 100,
): Promise<string> {
  if (!(await isTaken(base))) return base;

  for (let n = 2; n <= limit; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length)}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`could not find a free slug for "${base}" after ${limit} attempts`);
}

/**
 * Public paths. v1 is Thai-only and serves it unprefixed; other locales are
 * prefixed. Phase 7 owns the routing, but redirect rows are written from here,
 * so the shape has to be decided in one place rather than per caller.
 */
export const DEFAULT_LOCALE = "th";

export function localePrefix(locale: string): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

export function productPath(locale: string, slug: string): string {
  return `${localePrefix(locale)}/product/${slug}`;
}

export function categoryPath(locale: string, slug: string): string {
  return `${localePrefix(locale)}/category/${slug}`;
}

export function postPath(locale: string, slug: string): string {
  return `${localePrefix(locale)}/news/${slug}`;
}

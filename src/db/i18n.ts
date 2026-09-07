/**
 * Translation fallback. SPEC.md §6.
 *
 * "Thai is the fallback. A missing translation falls back to Thai and the page
 * is still valid — it never renders an empty string or the key name."
 *
 * These helpers are pure so the rule is testable without a database, and so the
 * same rule is used by every consumer rather than being re-implemented per query.
 */

/** Thai. Also the `is_default` row in `locales`. */
export const FALLBACK_LOCALE = "th";

export type Translated = { readonly locale: string };

export type Resolved<T extends Translated> = {
  readonly row: T;
  /** The locale actually rendered — differs from the request when falling back. */
  readonly locale: string;
  /** True when the requested locale had no row and Thai was substituted. */
  readonly isFallback: boolean;
};

/**
 * Pick the row for `locale`, falling back to Thai. Returns undefined only when
 * the entity has no translations at all, which is a data error rather than a
 * missing translation — callers should treat it as "not found", not as an
 * empty page.
 */
export function resolveTranslation<T extends Translated>(
  rows: readonly T[],
  locale: string,
  fallbackLocale: string = FALLBACK_LOCALE,
): Resolved<T> | undefined {
  const exact = rows.find((r) => r.locale === locale);
  if (exact) return { row: exact, locale, isFallback: false };

  const fallback = rows.find((r) => r.locale === fallbackLocale);
  if (fallback) return { row: fallback, locale: fallbackLocale, isFallback: true };

  return undefined;
}

/**
 * Group `*_i18n` rows by their parent id, then resolve each group. Used when a
 * listing query joins many entities at once and each needs its own fallback.
 */
export function resolveTranslations<T extends Translated>(
  rows: readonly T[],
  parentIdOf: (row: T) => string,
  locale: string,
  fallbackLocale: string = FALLBACK_LOCALE,
): Map<string, Resolved<T>> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = parentIdOf(row);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(row);
    else grouped.set(key, [row]);
  }

  const out = new Map<string, Resolved<T>>();
  for (const [key, bucket] of grouped) {
    const resolved = resolveTranslation(bucket, locale, fallbackLocale);
    if (resolved) out.set(key, resolved);
  }
  return out;
}

/**
 * Which of `locales` have a translation. Drives the admin's per-entity
 * completeness indicator and the tab-strip dots (SPEC.md §9).
 */
export function translationCoverage<T extends Translated>(
  rows: readonly T[],
  locales: readonly string[],
): ReadonlyMap<string, boolean> {
  const present = new Set(rows.map((r) => r.locale));
  return new Map(locales.map((l) => [l, present.has(l)]));
}

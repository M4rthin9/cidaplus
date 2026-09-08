import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { GLOBAL_LOCALE } from "@/db/schema/settings";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { TtlCache } from "./cache";
import {
  SETTINGS,
  type SettingKey,
  type SettingValue,
  defaultsFor,
  parseGlobal,
  parseLocalized,
} from "./registry";

/**
 * Reads and writes for the settings registry.
 *
 * Every page render reads settings (SPEC.md §6), so results are cached for 60
 * seconds and busted on write. The cache survives across requests inside one
 * server process; `globalThis` keeps it stable across HMR reloads in dev.
 */

declare global {
  var __cidaSettingsCache: TtlCache<unknown> | undefined;
}

const cache: TtlCache<unknown> =
  globalThis.__cidaSettingsCache ?? (globalThis.__cidaSettingsCache = new TtlCache<unknown>());

const cacheKey = (key: string, locale: string) => `${key}:${locale}`;

/**
 * A key's effective value for a locale: the global row merged with the
 * locale's row. Missing rows fall back to the registry defaults rather than
 * throwing, so the site renders against an empty settings table.
 */
export async function getSetting<K extends SettingKey>(
  key: K,
  locale: string = DEFAULT_LOCALE,
): Promise<SettingValue<K>> {
  const ck = cacheKey(key, locale);
  const hit = cache.get(ck);
  if (hit !== undefined) return hit as SettingValue<K>;

  /**
   * A settings read must never take the site down. §6 already requires a
   * missing row to fall back to the default; an unreachable database is the
   * same situation with a louder cause, and the chrome rendering in default
   * colours beats a 500. It also means `next build` can prerender without a
   * database, which §11's build-in-CI-and-pull flow depends on.
   */
  let rows: { locale: string; value: unknown }[] = [];
  try {
    rows = await db
      .select({ locale: settings.locale, value: settings.value })
      .from(settings)
      .where(and(eq(settings.key, key), inArray(settings.locale, [GLOBAL_LOCALE, locale])));
  } catch (error) {
    console.error(`[settings] falling back to defaults for "${key}":`, error);
    return defaultsFor(key);
  }

  const globalRow = rows.find((r) => r.locale === GLOBAL_LOCALE)?.value;
  const localeRow = rows.find((r) => r.locale === locale)?.value;

  const value = {
    ...parseGlobal(key, globalRow),
    ...parseLocalized(key, localeRow),
  } as SettingValue<K>;

  cache.set(ck, value);
  return value;
}

/** Raw stored values for the admin forms — defaults applied, nothing merged away. */
export async function getSettingForEditing<K extends SettingKey>(
  key: K,
  locale: string = DEFAULT_LOCALE,
): Promise<SettingValue<K>> {
  return getSetting(key, locale);
}

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/**
 * Upsert one scope of one key. Splitting global from localized is what stops a
 * structural value being duplicated into every locale row (§6).
 */
export async function writeSetting(
  exec: Executor,
  key: SettingKey,
  scope: "global" | "localized",
  locale: string,
  value: unknown,
  updatedBy: string,
): Promise<void> {
  const rowLocale = scope === "global" ? GLOBAL_LOCALE : locale;

  await exec
    .insert(settings)
    .values({ key, locale: rowLocale, value: value as object, updatedBy })
    .onConflictDoUpdate({
      target: [settings.key, settings.locale],
      set: { value: value as object, updatedBy, updatedAt: new Date() },
    });
}

/**
 * Bust the cache after a write. Clears every entry for the key rather than one
 * locale, because a global row change affects every locale's merged value.
 */
export function bustSetting(key: SettingKey): void {
  for (const locale of [GLOBAL_LOCALE, DEFAULT_LOCALE]) cache.delete(cacheKey(key, locale));
  // Locales are few and the cost of a full clear is one query per key; being
  // exact here is not worth the risk of a stale colour surviving a save.
  cache.clear();
}

export function settingsCacheSize(): number {
  return cache.size;
}

/** Current stored values for every key, for the settings index page. */
export async function getAllSettings(locale: string = DEFAULT_LOCALE) {
  const entries = await Promise.all(
    (Object.keys(SETTINGS) as SettingKey[]).map(
      async (key) => [key, await getSetting(key, locale)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

export { defaultsFor };

import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { locales } from "@/db/schema";
import { DEFAULT_LOCALE } from "@/lib/slug";

export type EnabledLocale = { code: string; label: string; isDefault: boolean };

/**
 * The locales actually switched on, from the database. §14 decision 9 promises
 * that turning a language on is a row update, so nothing here reads a constant:
 * the routing knows the URL shapes, this knows which of them are live.
 *
 * Like the settings reads, this never throws — a database blip must not take
 * the public site down, and Thai alone is always a correct answer.
 */
export async function enabledLocales(): Promise<EnabledLocale[]> {
  try {
    const rows = await db
      .select({
        code: locales.code,
        label: locales.labelNative,
        isDefault: locales.isDefault,
      })
      .from(locales)
      .where(eq(locales.isEnabled, true))
      .orderBy(asc(locales.sortOrder));

    if (rows.length > 0) return rows;
  } catch {
    // fall through to the Thai-only answer below
  }

  return [{ code: DEFAULT_LOCALE, label: "ไทย", isDefault: true }];
}

export async function isLocaleEnabled(code: string): Promise<boolean> {
  const all = await enabledLocales();
  return all.some((l) => l.code === code);
}

import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { menuI18n, menus } from "@/db/schema";
import { FALLBACK_LOCALE, resolveTranslation } from "@/db/i18n";
import { sanitizeMenuItems, type MenuItems, type MenuLocation } from "./schema";

/**
 * Menu items for one location. SPEC.md §5, §6.
 *
 * Returns `null` when the operator has never saved this menu, which is not the
 * same as an empty menu: the header and footer then fall back to the navigation
 * the site shipped with (including the live category list), rather than
 * rendering nothing. Saving even one item takes over completely.
 */
export async function getMenuItems(
  location: MenuLocation,
  locale: string,
): Promise<MenuItems | null> {
  const localeSet = locale === FALLBACK_LOCALE ? [FALLBACK_LOCALE] : [locale, FALLBACK_LOCALE];

  try {
    const rows = await db
      .select({ locale: menuI18n.locale, items: menuI18n.items })
      .from(menus)
      .innerJoin(menuI18n, eq(menuI18n.menuId, menus.id))
      .where(and(eq(menus.location, location), inArray(menuI18n.locale, localeSet)));

    const hit = resolveTranslation(rows, locale);
    if (!hit) return null;

    const items = sanitizeMenuItems(hit.row.items);
    return items.length > 0 ? items : null;
  } catch {
    // Navigation must not be able to take the site down.
    return null;
  }
}

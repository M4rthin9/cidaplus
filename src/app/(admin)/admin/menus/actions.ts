"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { menuI18n, menus } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { MENU_LOCATIONS, sanitizeMenuItems, type MenuLocation } from "@/lib/menus/schema";
import { DEFAULT_LOCALE } from "@/lib/slug";

export type MenuFormState = { message?: string; error?: string };

function isLocation(value: string): value is MenuLocation {
  return (MENU_LOCATIONS as readonly string[]).includes(value);
}

/**
 * Save one menu. The item tree arrives as JSON — it is nested and ordered, and
 * flattening it into form fields would only move the parsing somewhere less
 * careful. `sanitizeMenuItems` rebuilds it, so an item whose `href` fails
 * validation is dropped rather than rendered live in the site's navigation.
 */
export async function saveMenuAction(
  location: string,
  _previous: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const user = await requireAdmin();
  if (!isLocation(location)) return { error: "ตำแหน่งเมนูไม่ถูกต้อง" };

  const raw = formData.get("items");
  let items;
  try {
    items = sanitizeMenuItems(JSON.parse(typeof raw === "string" ? raw : "[]"));
  } catch {
    return { error: "ข้อมูลเมนูไม่ถูกต้อง" };
  }

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.location, location));

    const menuId =
      existing?.id ??
      (await tx.insert(menus).values({ location }).returning({ id: menus.id }))[0]?.id;

    if (!menuId) throw new Error("could not resolve menu id");

    const [before] = await tx
      .select({ items: menuI18n.items })
      .from(menuI18n)
      .where(and(eq(menuI18n.menuId, menuId), eq(menuI18n.locale, DEFAULT_LOCALE)));

    if (before) {
      await tx
        .update(menuI18n)
        .set({ items, updatedAt: new Date() })
        .where(and(eq(menuI18n.menuId, menuId), eq(menuI18n.locale, DEFAULT_LOCALE)));
    } else {
      await tx.insert(menuI18n).values({ menuId, locale: DEFAULT_LOCALE, items });
    }

    await writeAudit(tx, {
      userId: user.id,
      entity: "menus",
      entityId: menuId,
      action: before ? "update" : "create",
      // The tree itself would be unreadable in an audit row; the shape is what
      // an operator scans the log for.
      diff: {
        location: { from: location, to: location },
        itemCount: {
          from: Array.isArray(before?.items) ? before.items.length : 0,
          to: items.length,
        },
      },
    });
  });

  revalidatePath("/admin/menus");
  /**
   * The header and footer render in `[locale]/layout.tsx`, so the whole public
   * tree is revalidated by route pattern — `revalidatePath("/", "layout")`
   * would miss it, because the cache entry is keyed by the matched route.
   */
  revalidatePath("/[locale]", "layout");

  return { message: "บันทึกเมนูเรียบร้อยแล้ว" };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryI18n, products } from "@/db/schema";
import { diffFields, writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE, slugifyWithFallback } from "@/lib/slug";
import { categorySchema, reorderSchema } from "@/lib/validation/catalog";
import { fieldErrors } from "@/lib/validation/user";
import { categorySlugTaken, freeCategorySlug, recordSlugRedirect } from "@/lib/catalog/slug-store";

export type CategoryFormState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
};

function parse(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    parentId: formData.get("parentId") ?? "",
    heroMediaId: formData.get("heroMediaId") ?? "",
    isPublished: formData.get("isPublished") === "on",
  });
}

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const base = parsed.data.slug || slugifyWithFallback(parsed.data.name, "cat");
  if (parsed.data.slug && (await categorySlugTaken(DEFAULT_LOCALE, parsed.data.slug))) {
    return { errors: { slug: "ลิงก์นี้ถูกใช้แล้ว" } };
  }
  const slug = await freeCategorySlug(DEFAULT_LOCALE, base);

  // New categories sort last; §9's drag-to-reorder is what moves them.
  const [maxRow] = await db
    .select({ next: sql<number>`coalesce(max(${categories.sortOrder}), -1) + 1` })
    .from(categories)
    .where(isNull(categories.deletedAt));

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(categories)
      .values({
        parentId: parsed.data.parentId ?? null,
        heroMediaId: parsed.data.heroMediaId ?? null,
        isPublished: parsed.data.isPublished,
        sortOrder: maxRow?.next ?? 0,
      })
      .returning();
    if (!row) throw new Error("insert returned no row");

    await tx.insert(categoryI18n).values({
      categoryId: row.id,
      locale: DEFAULT_LOCALE,
      slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });

    await writeAudit(tx, {
      userId: user.id,
      entity: "categories",
      entityId: row.id,
      action: "create",
      diff: diffFields(null, { name: parsed.data.name, slug, isPublished: row.isPublished }),
    });
  });

  revalidatePath("/admin/categories");
  redirect("/admin/categories?created=1");
}

export async function updateCategoryAction(
  categoryId: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // One level of nesting only (§5), and a category cannot parent itself.
  if (parsed.data.parentId === categoryId) {
    return { errors: { parentId: "หมวดหมู่ไม่สามารถเป็นหมวดหมู่แม่ของตัวเองได้" } };
  }
  if (parsed.data.parentId) {
    const [parent] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.id, parsed.data.parentId))
      .limit(1);
    if (parent?.parentId) {
      return { errors: { parentId: "รองรับการจัดกลุ่มเพียงหนึ่งระดับเท่านั้น" } };
    }
    const [childCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(categories)
      .where(and(eq(categories.parentId, categoryId), isNull(categories.deletedAt)));
    if ((childCount?.n ?? 0) > 0) {
      return {
        errors: { parentId: "หมวดหมู่นี้มีหมวดหมู่ย่อยอยู่แล้ว จึงย้ายไปเป็นหมวดหมู่ย่อยไม่ได้" },
      };
    }
  }

  const [before] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  const [beforeI18n] = await db
    .select()
    .from(categoryI18n)
    .where(and(eq(categoryI18n.categoryId, categoryId), eq(categoryI18n.locale, DEFAULT_LOCALE)))
    .limit(1);
  if (!before || !beforeI18n) return { message: "ไม่พบหมวดหมู่นี้" };

  const requested = parsed.data.slug || slugifyWithFallback(parsed.data.name, "cat");
  if (
    requested !== beforeI18n.slug &&
    (await categorySlugTaken(DEFAULT_LOCALE, requested, categoryId))
  ) {
    return { errors: { slug: "ลิงก์นี้ถูกใช้แล้ว" } };
  }
  const slug = await freeCategorySlug(DEFAULT_LOCALE, requested, categoryId);

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(categories)
      .set({
        parentId: parsed.data.parentId ?? null,
        heroMediaId: parsed.data.heroMediaId ?? null,
        isPublished: parsed.data.isPublished,
      })
      .where(eq(categories.id, categoryId))
      .returning();
    if (!after) throw new Error("update returned no row");

    await tx
      .update(categoryI18n)
      .set({ slug, name: parsed.data.name, description: parsed.data.description ?? null })
      .where(and(eq(categoryI18n.categoryId, categoryId), eq(categoryI18n.locale, DEFAULT_LOCALE)));

    // §9: only a published slug leaves a public URL behind.
    if (before.isPublished) {
      await recordSlugRedirect(tx, "category", DEFAULT_LOCALE, beforeI18n.slug, slug);
    }

    await writeAudit(tx, {
      userId: user.id,
      entity: "categories",
      entityId: categoryId,
      action: "update",
      diff: diffFields(
        {
          name: beforeI18n.name,
          slug: beforeI18n.slug,
          isPublished: before.isPublished,
          parentId: before.parentId,
        },
        { name: parsed.data.name, slug, isPublished: after.isPublished, parentId: after.parentId },
      ),
    });
  });

  revalidatePath("/admin/categories");
  redirect("/admin/categories?updated=1");
}

/**
 * §9: "A category with products cannot be deleted until products are moved or
 * unpublished." Read as: block while any live product still points at it.
 */
export async function deleteCategoryAction(categoryId: string): Promise<CategoryFormState> {
  const user = await requireAdmin();

  const [inUse] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt)));

  if ((inUse?.n ?? 0) > 0) {
    return {
      message: `ลบไม่ได้ มีสินค้าอยู่ในหมวดหมู่นี้ ${inUse?.n} รายการ กรุณาย้ายสินค้าไปหมวดหมู่อื่นก่อน`,
    };
  }

  const [children] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .where(and(eq(categories.parentId, categoryId), isNull(categories.deletedAt)));
  if ((children?.n ?? 0) > 0) {
    return { message: `ลบไม่ได้ มีหมวดหมู่ย่อยอยู่ ${children?.n} รายการ` };
  }

  const [before] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!before) return { message: "ไม่พบหมวดหมู่นี้" };

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(categories)
      .set({ deletedAt: new Date(), isPublished: false })
      .where(eq(categories.id, categoryId))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      entity: "categories",
      entityId: categoryId,
      action: "delete",
      diff: diffFields({ deletedAt: null }, { deletedAt: after?.deletedAt ?? null }),
    });
  });

  revalidatePath("/admin/categories");
  return { message: "ลบหมวดหมู่เรียบร้อยแล้ว" };
}

/** Drag-to-reorder (§5). The client sends the full ordered id list. */
export async function reorderCategoriesAction(ids: string[]): Promise<CategoryFormState> {
  const user = await requireAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return { message: "ลำดับไม่ถูกต้อง" };

  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx.update(categories).set({ sortOrder: index }).where(eq(categories.id, id));
    }
    await writeAudit(tx, {
      userId: user.id,
      entity: "categories",
      entityId: null,
      action: "reorder",
      diff: { order: { from: null, to: parsed.data.ids } },
    });
  });

  revalidatePath("/admin/categories");
  return { message: "บันทึกลำดับแล้ว" };
}

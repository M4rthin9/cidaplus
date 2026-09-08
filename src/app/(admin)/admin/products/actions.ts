"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { productI18n, productMedia, products } from "@/db/schema";
import { diffFields, writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE, slugifyWithFallback } from "@/lib/slug";
import {
  bulkActionSchema,
  productSchema,
  reorderSchema,
  toPublishColumns,
} from "@/lib/validation/catalog";
import { fieldErrors } from "@/lib/validation/user";
import { freeProductSlug, productSlugTaken, recordSlugRedirect } from "@/lib/catalog/slug-store";

export type ProductFormState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
};

function parse(formData: FormData) {
  const raw = formData.get("mediaIds");
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    shortDesc: formData.get("shortDesc") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    priceDisplay: formData.get("priceDisplay") ?? "exact",
    price: formData.get("price") ?? "",
    sku: formData.get("sku") ?? "",
    lineMessageOverride: formData.get("lineMessageOverride") ?? "",
    isFeatured: formData.get("isFeatured") === "on",
    publishState: formData.get("publishState") ?? "draft",
    publishedAt: formData.get("publishedAt") ?? "",
    mediaIds: typeof raw === "string" && raw.length > 0 ? raw.split(",").filter(Boolean) : [],
  });
}

function scheduledDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Replace the image set, preserving the order the operator chose. */
async function setProductMedia(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productId: string,
  mediaIds: readonly string[],
) {
  await tx.delete(productMedia).where(eq(productMedia.productId, productId));
  if (mediaIds.length === 0) return;
  await tx.insert(productMedia).values(
    mediaIds.map((mediaId, index) => ({
      productId,
      mediaId,
      sortOrder: index,
      isPrimary: index === 0,
    })),
  );
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const base = parsed.data.slug || slugifyWithFallback(parsed.data.name, "product");
  if (parsed.data.slug && (await productSlugTaken(DEFAULT_LOCALE, parsed.data.slug))) {
    return { errors: { slug: "ลิงก์นี้ถูกใช้แล้ว" } };
  }
  const slug = await freeProductSlug(DEFAULT_LOCALE, base);

  // sort_order is per category: products are listed within a category.
  const [maxRow] = await db
    .select({ next: sql<number>`coalesce(max(${products.sortOrder}), -1) + 1` })
    .from(products)
    .where(and(eq(products.categoryId, parsed.data.categoryId), isNull(products.deletedAt)));

  const publish = toPublishColumns(
    parsed.data.publishState,
    scheduledDate(parsed.data.publishedAt),
  );
  let newId = "";

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({
        categoryId: parsed.data.categoryId,
        price: parsed.data.price ?? null,
        priceDisplay: parsed.data.priceDisplay,
        sku: parsed.data.sku ?? null,
        lineMessageOverride: parsed.data.lineMessageOverride ?? null,
        isFeatured: parsed.data.isFeatured,
        sortOrder: maxRow?.next ?? 0,
        ...publish,
      })
      .returning();
    if (!row) throw new Error("insert returned no row");
    newId = row.id;

    await tx.insert(productI18n).values({
      productId: row.id,
      locale: DEFAULT_LOCALE,
      slug,
      name: parsed.data.name,
      shortDesc: parsed.data.shortDesc ?? null,
    });

    await setProductMedia(tx, row.id, parsed.data.mediaIds);

    await writeAudit(tx, {
      userId: user.id,
      entity: "products",
      entityId: row.id,
      action: "create",
      diff: diffFields(null, {
        name: parsed.data.name,
        slug,
        categoryId: row.categoryId,
        price: row.price,
        isPublished: row.isPublished,
      }),
    });
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${newId}?created=1`);
}

export async function updateProductAction(
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const [before] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  const [beforeI18n] = await db
    .select()
    .from(productI18n)
    .where(and(eq(productI18n.productId, productId), eq(productI18n.locale, DEFAULT_LOCALE)))
    .limit(1);
  if (!before || !beforeI18n) return { message: "ไม่พบสินค้านี้" };

  const requested = parsed.data.slug || slugifyWithFallback(parsed.data.name, "product");
  if (
    requested !== beforeI18n.slug &&
    (await productSlugTaken(DEFAULT_LOCALE, requested, productId))
  ) {
    return { errors: { slug: "ลิงก์นี้ถูกใช้แล้ว" } };
  }
  const slug = await freeProductSlug(DEFAULT_LOCALE, requested, productId);

  const publish = toPublishColumns(
    parsed.data.publishState,
    scheduledDate(parsed.data.publishedAt),
  );

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(products)
      .set({
        categoryId: parsed.data.categoryId,
        price: parsed.data.price ?? null,
        priceDisplay: parsed.data.priceDisplay,
        sku: parsed.data.sku ?? null,
        lineMessageOverride: parsed.data.lineMessageOverride ?? null,
        isFeatured: parsed.data.isFeatured,
        ...publish,
      })
      .where(eq(products.id, productId))
      .returning();
    if (!after) throw new Error("update returned no row");

    await tx
      .update(productI18n)
      .set({ slug, name: parsed.data.name, shortDesc: parsed.data.shortDesc ?? null })
      .where(and(eq(productI18n.productId, productId), eq(productI18n.locale, DEFAULT_LOCALE)));

    await setProductMedia(tx, productId, parsed.data.mediaIds);

    if (before.isPublished) {
      await recordSlugRedirect(tx, "product", DEFAULT_LOCALE, beforeI18n.slug, slug);
    }

    await writeAudit(tx, {
      userId: user.id,
      entity: "products",
      entityId: productId,
      action: "update",
      diff: diffFields(
        {
          name: beforeI18n.name,
          slug: beforeI18n.slug,
          categoryId: before.categoryId,
          price: before.price,
          priceDisplay: before.priceDisplay,
          isPublished: before.isPublished,
          isFeatured: before.isFeatured,
          lineMessageOverride: before.lineMessageOverride,
        },
        {
          name: parsed.data.name,
          slug,
          categoryId: after.categoryId,
          price: after.price,
          priceDisplay: after.priceDisplay,
          isPublished: after.isPublished,
          isFeatured: after.isFeatured,
          lineMessageOverride: after.lineMessageOverride,
        },
      ),
    });
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { message: "บันทึกเรียบร้อยแล้ว" };
}

export async function deleteProductAction(productId: string): Promise<ProductFormState> {
  const user = await requireAdmin();
  const [before] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!before) return { message: "ไม่พบสินค้านี้" };

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(products)
      .set({ deletedAt: new Date(), isPublished: false })
      .where(eq(products.id, productId))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      entity: "products",
      entityId: productId,
      action: "delete",
      diff: diffFields({ deletedAt: null }, { deletedAt: after?.deletedAt ?? null }),
    });
  });

  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=1");
}

export async function restoreProductAction(productId: string): Promise<ProductFormState> {
  const user = await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.update(products).set({ deletedAt: null }).where(eq(products.id, productId));
    await writeAudit(tx, {
      userId: user.id,
      entity: "products",
      entityId: productId,
      action: "restore",
      diff: { deletedAt: { from: "set", to: null } },
    });
  });
  revalidatePath("/admin/products");
  return { message: "กู้คืนสินค้าเรียบร้อยแล้ว" };
}

/** §9 bulk actions: publish, unpublish, change category, delete. */
export async function bulkProductAction(
  ids: string[],
  action: "publish" | "unpublish" | "move" | "delete",
  categoryId?: string,
): Promise<ProductFormState> {
  const user = await requireAdmin();
  const parsed = bulkActionSchema.safeParse({ ids, action, categoryId });
  if (!parsed.success) return { message: fieldErrors(parsed.error).ids ?? "คำสั่งไม่ถูกต้อง" };
  if (parsed.data.action === "move" && !parsed.data.categoryId) {
    return { message: "กรุณาเลือกหมวดหมู่ปลายทาง" };
  }

  const patch =
    parsed.data.action === "publish"
      ? { isPublished: true, publishedAt: new Date() }
      : parsed.data.action === "unpublish"
        ? { isPublished: false }
        : parsed.data.action === "move"
          ? { categoryId: parsed.data.categoryId }
          : { deletedAt: new Date(), isPublished: false };

  await db.transaction(async (tx) => {
    await tx.update(products).set(patch).where(inArray(products.id, parsed.data.ids));
    // One audit row per product: a bulk edit must be as traceable as a single one.
    for (const id of parsed.data.ids) {
      await writeAudit(tx, {
        userId: user.id,
        entity: "products",
        entityId: id,
        action: parsed.data.action === "delete" ? "delete" : "update",
        diff: {
          bulk: { from: null, to: parsed.data.action },
          ...(categoryId ? { categoryId: { from: null, to: categoryId } } : {}),
        },
      });
    }
  });

  revalidatePath("/admin/products");
  const labels = {
    publish: "เผยแพร่",
    unpublish: "ยกเลิกเผยแพร่",
    move: "ย้ายหมวดหมู่",
    delete: "ลบ",
  };
  return { message: `${labels[parsed.data.action]} ${parsed.data.ids.length} รายการเรียบร้อยแล้ว` };
}

export async function reorderProductsAction(ids: string[]): Promise<ProductFormState> {
  const user = await requireAdmin();
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return { message: "ลำดับไม่ถูกต้อง" };

  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx.update(products).set({ sortOrder: index }).where(eq(products.id, id));
    }
    await writeAudit(tx, {
      userId: user.id,
      entity: "products",
      entityId: null,
      action: "reorder",
      diff: { order: { from: null, to: parsed.data.ids } },
    });
  });

  revalidatePath("/admin/products");
  return { message: "บันทึกลำดับแล้ว" };
}

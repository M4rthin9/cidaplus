import Link from "next/link";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryI18n, productI18n, productMedia, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { Button, FormBanner } from "@/components/ui/field";
import { ProductTable, type ProductRow } from "./product-table";

export const metadata = { title: "สินค้า" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireAdmin();
  const { deleted } = await searchParams;

  const rows = await db
    .select({
      id: products.id,
      name: productI18n.name,
      slug: productI18n.slug,
      categoryId: products.categoryId,
      categoryName: categoryI18n.name,
      price: products.price,
      priceDisplay: products.priceDisplay,
      isPublished: products.isPublished,
      publishedAt: products.publishedAt,
      imageCount: sql<number>`(
        select count(*)::int from ${productMedia} where ${productMedia.productId} = ${products.id}
      )`,
    })
    .from(products)
    .innerJoin(
      productI18n,
      and(eq(productI18n.productId, products.id), eq(productI18n.locale, DEFAULT_LOCALE)),
    )
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(isNull(products.deletedAt))
    .orderBy(asc(products.sortOrder));

  const categoryList = await db
    .select({ id: categories.id, name: categoryI18n.name })
    .from(categories)
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder));

  const data: ProductRow[] = rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      {deleted ? <FormBanner kind="success">ลบสินค้าเรียบร้อยแล้ว</FormBanner> : null}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">สินค้า</h1>
        <Link href="/admin/products/new" className="ms-auto">
          <Button>เพิ่มสินค้า</Button>
        </Link>
      </div>
      <ProductTable rows={data} categories={categoryList} />
    </div>
  );
}

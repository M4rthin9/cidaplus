import Link from "next/link";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryI18n, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { Button, FormBanner } from "@/components/ui/field";
import { CategoryTree, type CategoryNode } from "./category-tree";

export const metadata = { title: "หมวดหมู่" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  await requireAdmin();
  const { created, updated } = await searchParams;

  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      isPublished: categories.isPublished,
      sortOrder: categories.sortOrder,
      name: categoryI18n.name,
      slug: categoryI18n.slug,
      productCount: sql<number>`(
        select count(*)::int from ${products}
        where ${products.categoryId} = ${categories.id} and ${products.deletedAt} is null
      )`,
    })
    .from(categories)
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder));

  const tops = rows.filter((r) => !r.parentId);
  const tree: CategoryNode[] = tops.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    isPublished: t.isPublished,
    productCount: t.productCount,
    children: rows
      .filter((r) => r.parentId === t.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        isPublished: c.isPublished,
        productCount: c.productCount,
      })),
  }));

  return (
    <div className="space-y-6">
      {created ? <FormBanner kind="success">เพิ่มหมวดหมู่เรียบร้อยแล้ว</FormBanner> : null}
      {updated ? <FormBanner kind="success">บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว</FormBanner> : null}

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">หมวดหมู่</h1>
        <Link href="/admin/categories/new" className="ms-auto">
          <Button>เพิ่มหมวดหมู่</Button>
        </Link>
      </div>

      <CategoryTree initial={tree} />
    </div>
  );
}

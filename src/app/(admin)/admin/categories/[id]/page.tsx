import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryI18n, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { Button } from "@/components/ui/field";
import { deleteCategoryAction, updateCategoryAction } from "../actions";
import { CategoryForm } from "../category-form";

export const metadata = { title: "แก้ไขหมวดหมู่" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      isPublished: categories.isPublished,
      name: categoryI18n.name,
      slug: categoryI18n.slug,
      description: categoryI18n.description,
    })
    .from(categories)
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(eq(categories.id, id))
    .limit(1);

  if (!row) notFound();

  const parents = await db
    .select({ id: categories.id, name: categoryI18n.name })
    .from(categories)
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(and(isNull(categories.deletedAt), isNull(categories.parentId), ne(categories.id, id)))
    .orderBy(asc(categories.sortOrder));

  const [used] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.categoryId, id), isNull(products.deletedAt)));

  const action = updateCategoryAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/categories" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าหมวดหมู่
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">แก้ไข {row.name}</h1>
      </div>

      <CategoryForm
        action={action}
        mode="edit"
        parents={parents}
        defaults={{
          name: row.name,
          slug: row.slug,
          description: row.description ?? "",
          parentId: row.parentId ?? "",
          isPublished: row.isPublished,
        }}
      />

      <section className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">ลบหมวดหมู่</h2>
        <p className="mt-2 text-(--color-text)">
          {(used?.n ?? 0) > 0
            ? `มีสินค้าอยู่ในหมวดหมู่นี้ ${used?.n} รายการ ต้องย้ายสินค้าออกก่อนจึงจะลบได้`
            : "ไม่มีสินค้าอยู่ในหมวดหมู่นี้ ลบได้อย่างปลอดภัย"}
        </p>
        <form
          className="mt-4"
          action={async () => {
            "use server";
            await deleteCategoryAction(id);
          }}
        >
          <Button type="submit" variant="danger" disabled={(used?.n ?? 0) > 0}>
            ลบหมวดหมู่
          </Button>
        </form>
      </section>
    </div>
  );
}

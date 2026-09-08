import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryI18n } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { createCategoryAction } from "../actions";
import { CategoryForm } from "../category-form";

export const metadata = { title: "เพิ่มหมวดหมู่" };

export default async function NewCategoryPage() {
  await requireAdmin();
  const parents = await db
    .select({ id: categories.id, name: categoryI18n.name })
    .from(categories)
    .innerJoin(
      categoryI18n,
      and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, DEFAULT_LOCALE)),
    )
    .where(and(isNull(categories.deletedAt), isNull(categories.parentId)))
    .orderBy(asc(categories.sortOrder));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/categories" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าหมวดหมู่
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">เพิ่มหมวดหมู่</h1>
      </div>
      <CategoryForm action={createCategoryAction} mode="create" parents={parents} />
    </div>
  );
}

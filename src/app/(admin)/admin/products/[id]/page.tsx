import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productI18n, productMedia, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE, productPath } from "@/lib/slug";
import { categoryOptions, localeTabs, mediaPickerItems } from "@/lib/catalog/queries";
import { fromPublishColumns } from "@/lib/validation/catalog";
import { Button, FormBanner } from "@/components/ui/field";
import { deleteProductAction, updateProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const metadata = { title: "แก้ไขสินค้า" };

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;

  const [row] = await db
    .select()
    .from(products)
    .innerJoin(
      productI18n,
      and(eq(productI18n.productId, products.id), eq(productI18n.locale, DEFAULT_LOCALE)),
    )
    .where(eq(products.id, id))
    .limit(1);

  if (!row) notFound();

  const images = await db
    .select({ mediaId: productMedia.mediaId })
    .from(productMedia)
    .where(eq(productMedia.productId, id))
    .orderBy(asc(productMedia.sortOrder));

  const [categories, media, locales] = await Promise.all([
    categoryOptions(),
    mediaPickerItems(),
    localeTabs("product", id),
  ]);

  const p = row.products;
  const i = row.product_i18n;
  const action = updateProductAction.bind(null, id);

  return (
    <div className="space-y-6">
      {created ? <FormBanner kind="success">เพิ่มสินค้าเรียบร้อยแล้ว</FormBanner> : null}
      <div>
        <Link href="/admin/products" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าสินค้า
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">แก้ไข {i.name}</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {productPath(DEFAULT_LOCALE, i.slug)}
        </p>
      </div>

      <ProductForm
        action={action}
        mode="edit"
        productId={id}
        categories={categories}
        media={media}
        locales={locales}
        defaults={{
          name: i.name,
          slug: i.slug,
          shortDesc: i.shortDesc ?? "",
          categoryId: p.categoryId,
          price: p.price ?? "",
          priceDisplay: p.priceDisplay,
          sku: p.sku ?? "",
          isFeatured: p.isFeatured,
          publishState: fromPublishColumns(p.isPublished, p.publishedAt),
          publishedAt: toLocalInput(p.publishedAt),
          mediaIds: images.map((m) => m.mediaId),
        }}
      />

      <section className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6">
        <h2 className="text-lg font-semibold">ลบสินค้า</h2>
        <p className="mt-2 text-(--color-text)">สินค้าจะถูกซ่อนจากเว็บไซต์ และกู้คืนได้ภายหลัง</p>
        <form
          className="mt-4"
          action={async () => {
            "use server";
            await deleteProductAction(id);
          }}
        >
          <Button type="submit" variant="danger">
            ลบสินค้า
          </Button>
        </form>
      </section>
    </div>
  );
}

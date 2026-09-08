import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { categoryOptions, localeTabs, mediaPickerItems } from "@/lib/catalog/queries";
import { createProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const metadata = { title: "เพิ่มสินค้า" };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, media, locales] = await Promise.all([
    categoryOptions(),
    mediaPickerItems(),
    localeTabs("product", null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-(--color-brand) hover:underline">
          ← กลับไปหน้าสินค้า
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">เพิ่มสินค้า</h1>
      </div>
      <ProductForm
        action={createProductAction}
        mode="create"
        categories={categories}
        media={media}
        locales={locales}
        defaults={{
          name: "",
          slug: "",
          shortDesc: "",
          categoryId: categories[0]?.id ?? "",
          price: "",
          priceDisplay: "exact",
          sku: "",
          isFeatured: false,
          publishState: "draft",
          publishedAt: "",
          mediaIds: [],
        }}
      />
    </div>
  );
}

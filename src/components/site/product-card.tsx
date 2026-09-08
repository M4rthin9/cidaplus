import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MediaPlaceholder, MediaThumb } from "@/components/media/media-thumb";
import { formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/lib/public/queries";

/**
 * The most important component on the site (docs/DESIGN.md).
 *
 * Portrait 3:4 image, then name, then price — and nothing else. No badge, no
 * category label, no enquiry control: the LINE button lives on the detail page
 * so the card stays calm. The whole card is one link.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("product");
  const price = formatPrice(product.price);

  return (
    <article className="group">
      <Link
        href={`/product/${product.slug}`}
        className="block rounded-(--radius-card) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-brand)"
      >
        <div className="overflow-hidden rounded-(--radius-card) border border-(--color-border) transition-colors group-hover:border-(--color-heading)/15">
          {product.image ? (
            <MediaThumb
              media={product.image}
              aspect="product"
              width={800}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              className="rounded-none border-0 transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <MediaPlaceholder aspect="product" className="rounded-none" label={t("noImage")} />
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-medium text-(--color-heading)">
          {product.name}
        </h3>

        {/*
         * Never an empty gap: `contact` renders สอบถามราคา in body colour, which
         * is the state most of this catalog is in.
         */}
        <p className="mt-2 text-lg font-semibold text-(--color-heading)">
          {product.priceDisplay === "hidden" ? null : product.priceDisplay === "contact" ||
            price === null ? (
            <span className="text-base font-normal text-(--color-text)">
              {t("contactForPrice")}
            </span>
          ) : (
            t("baht", { amount: price })
          )}
        </p>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

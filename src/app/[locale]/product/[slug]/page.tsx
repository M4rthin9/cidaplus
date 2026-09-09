import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { bodyMedia, productBySlug, relatedProducts } from "@/lib/public/queries";
import { assertEnv } from "@/lib/env";
import { ogImageForStorageKey, publicMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { formatPrice } from "@/lib/format";
import { RichText } from "@/lib/richtext/render";
import { MediaPlaceholder, MediaThumb } from "@/components/media/media-thumb";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductLineCta } from "@/components/site/product-line-cta";
import { ProductGrid } from "@/components/site/product-card";
import { SectionHeading } from "@/components/site/section-heading";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await productBySlug(locale, decodeURIComponent(slug));
  if (!product) return {};

  const cover = product.images[0];
  return publicMetadata({
    locale,
    // Each locale's own slug, so the hreflang set points at the same product
    // rather than at a 404 (§10).
    paths: Object.fromEntries(
      Object.entries(product.slugsByLocale).map(([code, s]) => [code, `/product/${s}`]),
    ),
    title: product.name,
    description: product.shortDesc ?? undefined,
    image: cover ? ogImageForStorageKey(cover.storageKey, cover.width) : undefined,
  });
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await productBySlug(locale, decodeURIComponent(slug));
  if (!product) notFound();

  const t = await getTranslations("product");
  const tNav = await getTranslations("nav");
  const base = assertEnv().NEXT_PUBLIC_SITE_URL;

  const [media, related] = await Promise.all([
    bodyMedia(product.body, locale),
    relatedProducts(locale, product.categoryId, product.id),
  ]);

  const price = formatPrice(product.price);
  const [cover, ...rest] = product.images;

  const crumbs = [
    { name: tNav("home"), path: "/" },
    { name: tNav("categories"), path: "/categories" },
    ...(product.category
      ? [{ name: product.category.name, path: `/category/${product.category.slug}` }]
      : []),
    { name: product.name, path: `/product/${product.slug}` },
  ];

  return (
    <main
      id="content"
      /* pb-24 on mobile clears the fixed LINE bar so it never covers the last row. */
      className="mx-auto max-w-(--container-site) px-4 py-12 pb-24 md:px-6 md:pb-12"
    >
      {/* §10 names Product and BreadcrumbList; both describe this page. */}
      <JsonLd
        data={[
          productJsonLd({
            base,
            locale,
            name: product.name,
            description: product.shortDesc ?? undefined,
            path: `/product/${product.slug}`,
            images: product.images.map((image) =>
              ogImageForStorageKey(image.storageKey, image.width),
            ),
            sku: product.sku ?? undefined,
            price: product.price ?? undefined,
            priceDisplay: product.priceDisplay,
            categoryName: product.category?.name,
          }),
          breadcrumbJsonLd(base, locale, crumbs),
        ]}
      />

      <Breadcrumbs
        items={[
          { href: "/", label: tNav("home") },
          { href: "/categories", label: tNav("categories") },
          ...(product.category
            ? [{ href: `/category/${product.category.slug}`, label: product.category.name }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          {cover ? (
            <MediaThumb
              media={cover}
              aspect="product"
              width={1600}
              sizes="(max-width: 1024px) 100vw, 560px"
            />
          ) : (
            <MediaPlaceholder aspect="product" label={t("noImage")} />
          )}

          {rest.length > 0 && (
            <ul aria-label={t("gallery")} className="mt-4 grid grid-cols-4 gap-3">
              {rest.map((image) => (
                <li key={image.id}>
                  <MediaThumb media={image} aspect="product" width={400} sizes="120px" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sticky in the product info column on desktop (SPEC.md §8 item 2). */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h1 className="text-3xl font-semibold md:text-[40px]">{product.name}</h1>
          <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />

          {product.priceDisplay !== "hidden" && (
            <p className="mt-6 text-lg font-semibold text-(--color-heading)">
              {product.priceDisplay === "contact" || price === null ? (
                <span className="font-normal text-(--color-text)">{t("contactForPrice")}</span>
              ) : (
                t("baht", { amount: price })
              )}
            </p>
          )}

          {product.shortDesc && (
            <p className="mt-4 max-w-prose text-(--color-text)">{product.shortDesc}</p>
          )}

          <ProductLineCta slug={product.slug} />

          {product.sku && (
            <p className="mt-6 text-sm text-(--color-text-muted)">
              {t("sku")} <span className="lat">{product.sku}</span>
            </p>
          )}

          {product.specs.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-medium">{t("specs")}</h2>
              <dl className="mt-4 divide-y divide-(--color-border) border-y border-(--color-border)">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-3 gap-4 py-3 text-sm">
                    <dt className="text-(--color-text-muted)">{spec.label}</dt>
                    <dd className="col-span-2 text-(--color-text)">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {product.body && (
        <section className="mt-16 max-w-prose">
          <h2 className="text-xl font-medium">{t("description")}</h2>
          <div className="mt-4">
            <RichText doc={product.body} media={media} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <SectionHeading id="related">{t("related")}</SectionHeading>
          <div className="mt-8">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </main>
  );
}

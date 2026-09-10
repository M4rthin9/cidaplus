import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  PAGE_SIZE,
  alternateSlugs,
  categoryBySlug,
  productsInCategory,
  type ProductSort,
} from "@/lib/public/queries";
import { assertEnv } from "@/lib/env";
import { publicMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { ProductGrid } from "@/components/site/product-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Pagination } from "@/components/site/pagination";
import { SortLinks } from "@/components/site/sort-links";
import { LineBand } from "@/components/site/line-band";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

const SORTS: ProductSort[] = ["default", "newest", "price-asc", "price-desc"];

function parseSort(value: string | undefined): ProductSort {
  return SORTS.find((s) => s === value) ?? "default";
}

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const decoded = decodeURIComponent(slug);
  const category = await categoryBySlug(locale, decoded);
  if (!category) return {};

  const slugs = await alternateSlugs("category", decoded, locale);
  return publicMetadata({
    locale,
    paths: Object.fromEntries(Object.entries(slugs).map(([code, s]) => [code, `/category/${s}`])),
    title: category.name,
    description: category.description ?? undefined,
    // §10 asks for a per-entity OG image on products and posts only; a category
    // takes the site default rather than borrowing one of its products' photos.
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { page: pageParam, sort: sortParam } = await searchParams;
  const page = parsePage(pageParam);
  const sort = parseSort(sortParam);

  // Slugs are Thai UTF-8 (§14 decision 17), so the segment arrives percent-encoded.
  const category = await categoryBySlug(locale, decodeURIComponent(slug));
  if (!category) notFound();

  const t = await getTranslations("category");
  const tNav = await getTranslations("nav");
  const { items, total } = await productsInCategory(locale, category.id, page, sort);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // An out-of-range page is a dead end, not an empty grid.
  if (page > totalPages && total > 0) notFound();

  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    if (target > 1) query.set("page", String(target));
    if (sort !== "default") query.set("sort", sort);
    const qs = query.toString();
    return `/category/${category.slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <JsonLd
        data={breadcrumbJsonLd(assertEnv().NEXT_PUBLIC_SITE_URL, locale, [
          { name: tNav("home"), path: "/" },
          { name: tNav("categories"), path: "/categories" },
          { name: category.name, path: `/category/${category.slug}` },
        ])}
      />

      <Breadcrumbs
        items={[
          { href: "/", label: tNav("home") },
          { href: "/categories", label: tNav("categories") },
          { label: category.name },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-[40px]">{category.name}</h1>
          <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
          <p className="mt-3 text-sm text-(--color-text-muted)">{t("count", { count: total })}</p>
        </div>
        <SortLinks basePath={`/category/${category.slug}`} sort={sort} />
      </div>

      {category.description && (
        <p className="mt-6 max-w-prose text-(--color-text)">{category.description}</p>
      )}

      <section className="mt-10" aria-labelledby="category-products">
        {/*
         * The grid's cards are h3, so without this the page jumps h1 -> h3.
         * Visually the h1 above already says it, hence sr-only rather than a
         * second visible title.
         */}
        <h2 id="category-products" className="sr-only">
          {t("productsIn", { name: category.name })}
        </h2>
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <p className="text-(--color-text-muted)">{t("empty")}</p>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />

      <LineBand />
    </main>
  );
}

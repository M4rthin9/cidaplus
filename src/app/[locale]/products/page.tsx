import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  PAGE_SIZE,
  catalogProducts,
  publishedCategories,
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
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; sort?: string; category?: string; q?: string }>;
};

const SORTS: ProductSort[] = ["default", "newest", "price-asc", "price-desc"];

function parseSort(value: string | undefined): ProductSort {
  return SORTS.find((s) => s === value) ?? "default";
}

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** A cap, so a pathological query string cannot become a pathological LIKE. */
const MAX_QUERY_LENGTH = 100;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return publicMetadata({ locale, paths: "/products", title: t("title") });
}

/**
 * The catalog. Every control is a URL parameter — category, free text, sort and
 * page — so a filtered view is a link someone can send, and the filtering runs
 * in Postgres rather than in the visitor's browser (§8).
 *
 * The search control is a plain GET form: it works with JavaScript disabled,
 * needs no debouncing, and produces the same shareable URL the filter chips do.
 */
export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page: pageParam, sort: sortParam, category: categoryParam, q } = await searchParams;
  const page = parsePage(pageParam);
  const sort = parseSort(sortParam);
  const query = (q ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  const t = await getTranslations("catalog");
  const tCategory = await getTranslations("category");
  const tNav = await getTranslations("nav");

  const categories = await publishedCategories(locale);
  /**
   * The filter is a slug in the URL because that is what a person can read and
   * edit; an unknown slug filters nothing rather than 404ing, since it is a
   * refinement of a valid page, not a page of its own.
   */
  const selected = categoryParam
    ? (categories.find((c) => c.slug === categoryParam) ?? null)
    : null;

  const { items, total } = await catalogProducts(locale, {
    categoryId: selected?.id ?? null,
    query,
    sort,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages && total > 0) notFound();

  const buildHref = (next: {
    page?: number;
    sort?: ProductSort;
    category?: string | null;
    query?: string;
  }) => {
    const params = new URLSearchParams();
    const category = next.category === undefined ? (selected?.slug ?? null) : next.category;
    const text = next.query === undefined ? query : next.query;
    const targetSort = next.sort ?? sort;
    const targetPage = next.page ?? 1;

    if (category) params.set("category", category);
    if (text) params.set("q", text);
    if (targetSort !== "default") params.set("sort", targetSort);
    if (targetPage > 1) params.set("page", String(targetPage));

    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };

  const hasFilters = Boolean(selected || query);

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <JsonLd
        data={breadcrumbJsonLd(assertEnv().NEXT_PUBLIC_SITE_URL, locale, [
          { name: tNav("home"), path: "/" },
          { name: t("title"), path: "/products" },
        ])}
      />

      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: t("title") }]} />

      <h1 className="text-3xl font-semibold md:text-[40px]">{t("title")}</h1>
      <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />

      {/*
       * A GET form, so the result is a real URL. `action` is the unprefixed
       * path because next-intl rewrites it for the active locale; the hidden
       * inputs carry the other filters through so searching inside a category
       * does not silently clear it.
       */}
      <form action="/products" method="get" role="search" className="mt-8 flex flex-wrap gap-3">
        <label htmlFor="catalog-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="catalog-q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-4 py-3 text-(--color-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand)"
        />
        {selected && <input type="hidden" name="category" value={selected.slug} />}
        {sort !== "default" && <input type="hidden" name="sort" value={sort} />}
        <button
          type="submit"
          className="rounded-(--radius-control) bg-(--color-brand) px-5 py-3 font-medium text-white hover:bg-(--color-brand-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand)"
        >
          {t("searchSubmit")}
        </button>
      </form>

      <nav aria-label={t("filterCategory")} className="mt-6 flex flex-wrap gap-2">
        <Link
          href={buildHref({ category: null })}
          aria-current={selected ? undefined : "true"}
          className={
            selected
              ? "rounded-(--radius-control) px-3 py-1.5 text-sm text-(--color-text) hover:text-(--color-brand)"
              : "rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-1.5 text-sm font-medium text-(--color-brand)"
          }
        >
          {t("allCategories")}
        </Link>
        {categories.map((category) => {
          const active = selected?.id === category.id;
          return (
            <Link
              key={category.id}
              href={buildHref({ category: category.slug })}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-1.5 text-sm font-medium text-(--color-brand)"
                  : "rounded-(--radius-control) px-3 py-1.5 text-sm text-(--color-text) hover:text-(--color-brand)"
              }
            >
              {category.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-(--color-text-muted)">{t("resultCount", { count: total })}</p>
          {query && (
            <p className="mt-1 text-sm text-(--color-text-muted)">{t("resultsFor", { query })}</p>
          )}
        </div>
        <SortLinks sort={sort} hrefFor={(next) => buildHref({ sort: next })} />
      </div>

      <section aria-labelledby="catalog-results" className="mt-8">
        {/*
         * Visually the count above is the label; the outline still needs a
         * level between the page title and the h3 on each card, or a screen
         * reader jumps h1 to h3 and the grid reads as part of the filters.
         */}
        <h2 id="catalog-results" className="sr-only">
          {t("resultsRegion")}
        </h2>
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) px-6 py-12 text-center">
            <p className="text-(--color-heading)">{t("empty")}</p>
            <p className="mt-2 text-sm text-(--color-text-muted)">{t("emptyHint")}</p>
            {hasFilters && (
              <p className="mt-4">
                <Link
                  href="/products"
                  className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
                >
                  {t("clear")}
                </Link>
              </p>
            )}
          </div>
        )}
      </section>

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => buildHref({ page: target })}
      />

      <p className="mt-10 text-sm text-(--color-text-muted)">
        <Link href="/categories" className="hover:text-(--color-brand)">
          {tCategory("all")}
        </Link>
      </p>

      <LineBand />
    </main>
  );
}

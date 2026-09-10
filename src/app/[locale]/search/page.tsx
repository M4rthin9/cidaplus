import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { search } from "@/lib/public/queries";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductGrid } from "@/components/site/product-card";
import { PostCardList } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  // A search results page has nothing durable to index.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const t = await getTranslations("search");
  const tNav = await getTranslations("nav");
  const results = query ? await search(locale, query) : { products: [], posts: [] };
  const found = results.products.length + results.posts.length;

  return (
    <main
      id="content"
      className="storefront-page mx-auto max-w-(--container-site) px-4 py-12 md:px-6"
    >
      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: t("title") }]} />

      <h1 className="text-3xl font-semibold md:text-[40px]">{t("title")}</h1>
      <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />

      {/*
       * A GET form, so a search is a shareable URL and works without JS. The
       * action is empty: it submits to the current path, which the locale
       * prefix is already part of.
       */}
      <form role="search" className="mt-8 flex max-w-xl flex-wrap gap-3">
        <label htmlFor="q" className="sr-only">
          {t("placeholder")}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("placeholder")}
          className="min-w-0 flex-1 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-3 py-2.5 text-(--color-heading)"
        />
        <button
          type="submit"
          className="rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
        >
          {t("submit")}
        </button>
      </form>

      {query === "" ? (
        <p className="mt-10 text-(--color-text-muted)">{t("prompt")}</p>
      ) : (
        <>
          <p className="mt-10 text-(--color-text-muted)" aria-live="polite">
            {t("resultsFor", { query })}
          </p>

          {found === 0 && <p className="mt-6 text-(--color-text-muted)">{t("empty")}</p>}

          {results.products.length > 0 && (
            <section className="mt-10" aria-labelledby="search-products">
              <SectionHeading id="search-products">{t("products")}</SectionHeading>
              <div className="mt-8">
                <ProductGrid products={results.products} />
              </div>
            </section>
          )}

          {results.posts.length > 0 && (
            <section className="mt-16" aria-labelledby="search-posts">
              <SectionHeading id="search-posts">{t("posts")}</SectionHeading>
              <div className="mt-8">
                <PostCardList posts={results.posts} />
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

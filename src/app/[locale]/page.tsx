import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCachedSetting } from "@/lib/settings/cached";
import { featuredProducts, latestPosts, publishedCategories } from "@/lib/public/queries";
import { addFriendUrl } from "@/lib/line";
import { ProductGrid } from "@/components/site/product-card";
import { SectionHeading } from "@/components/site/section-heading";
import { LineLink } from "@/components/site/line-link";
import { PostCardList } from "@/components/site/post-card";
import { MediaPlaceholder, MediaThumb } from "@/components/media/media-thumb";
import { Seal } from "@/components/site/seal";

/**
 * Homepage. docs/DESIGN.md's layout reference, restricted to the bands that
 * have a real data source: hero, featured products, category showcase, news.
 *
 * The reference's value-prop checklist, trust-badge strip and "why us" grid are
 * deliberately absent. They are editable copy with nowhere to live until §5's
 * homepage section builder (`/admin/pages`) lands in phase 9; hard-coding Thai
 * marketing copy in this file now would mean tearing it out then, and §6 is
 * explicit that translatable text lives in the database rather than in code.
 */
export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tLine = await getTranslations("line");
  const tCategory = await getTranslations("category");
  const tNews = await getTranslations("news");

  const [general, line, featured, categories, posts] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("line", locale),
    featuredProducts(locale),
    publishedCategories(locale),
    latestPosts(locale),
  ]);

  return (
    <main id="content">
      {/*
       * The affiliation is above the fold, not buried in the footer
       * (docs/DESIGN.md, §14 decision 8). No full-bleed photograph: real
       * photography is still arriving, and a hero built around an image that
       * does not exist would ship broken.
       */}
      <section className="border-b border-(--color-border) bg-(--color-surface)">
        <div className="mx-auto flex max-w-(--container-site) flex-col items-start gap-8 px-4 py-16 md:flex-row md:items-center md:px-6 md:py-20">
          <Seal size={140} priority className="shrink-0" />
          <div>
            {general.organisation && (
              <p className="text-sm text-(--color-text-muted)">{general.organisation}</p>
            )}
            <h1 className="mt-2 text-3xl font-semibold md:text-[40px]">{general.siteName}</h1>
            <div className="mt-5 h-0.5 w-16 rounded-full bg-(--color-brand)" aria-hidden="true" />
            {general.tagline && (
              <p className="mt-6 max-w-prose text-(--color-text)">{general.tagline}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/categories"
                className="inline-flex items-center rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
              >
                {t("viewAllProducts")}
              </Link>
              <LineLink href={addFriendUrl(line.oaId)}>{tLine("openAccount")}</LineLink>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-(--container-site) px-4 md:px-6">
        <section className="py-16" aria-labelledby="home-featured">
          <SectionHeading
            id="home-featured"
            action={
              <Link
                href="/categories"
                className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
              >
                {t("viewAllProducts")}
              </Link>
            }
          >
            {t("featured")}
          </SectionHeading>

          <div className="mt-8">
            {featured.length > 0 ? (
              <ProductGrid products={featured} />
            ) : (
              <p className="text-(--color-text-muted)">{t("featuredEmpty")}</p>
            )}
          </div>
        </section>

        {/*
         * Category showcase — one band per category, alternating image and text
         * (docs/DESIGN.md section 6).
         */}
        <section className="py-4" aria-labelledby="home-categories">
          <SectionHeading id="home-categories">{t("browseCategories")}</SectionHeading>

          <div className="mt-8 flex flex-col gap-6">
            {categories.length === 0 && (
              <p className="text-(--color-text-muted)">{tCategory("noCategories")}</p>
            )}
            {categories.map((category, index) => (
              <article
                key={category.id}
                className="grid items-center gap-6 rounded-(--radius-card) border border-(--color-border) p-4 md:grid-cols-2 md:p-6"
              >
                <div className={index % 2 === 1 ? "md:order-2" : undefined}>
                  {category.image ? (
                    <MediaThumb
                      media={category.image}
                      aspect="cover"
                      width={800}
                      sizes="(max-width: 768px) 100vw, 560px"
                    />
                  ) : (
                    <MediaPlaceholder aspect="cover" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-medium">{category.name}</h3>
                  <p className="mt-2 text-sm text-(--color-text-muted)">
                    {tCategory("count", { count: category.productCount })}
                  </p>
                  {category.description && (
                    <p className="mt-4 text-(--color-text)">{category.description}</p>
                  )}
                  <Link
                    href={`/category/${category.slug}`}
                    className="mt-6 inline-flex items-center rounded-(--radius-control) border border-(--color-border) px-4 py-2.5 text-sm text-(--color-brand) hover:border-(--color-brand) hover:text-(--color-brand-hover)"
                  >
                    {t("viewCategory")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="py-16" aria-labelledby="home-news">
          <SectionHeading
            id="home-news"
            action={
              <Link
                href="/news"
                className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
              >
                {t("viewAllNews")}
              </Link>
            }
          >
            {t("latestNews")}
          </SectionHeading>

          <div className="mt-8">
            {posts.length > 0 ? (
              <PostCardList posts={posts} />
            ) : (
              <p className="text-(--color-text-muted)">{tNews("empty")}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publishedCategories } from "@/lib/public/queries";
import { publicMetadata } from "@/lib/seo/metadata";
import { MediaPlaceholder, MediaThumb } from "@/components/media/media-thumb";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SectionHeading } from "@/components/site/section-heading";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return publicMetadata({ locale, paths: "/categories", title: t("categories") });
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("category");
  const tNav = await getTranslations("nav");
  const categories = await publishedCategories(locale);

  return (
    <main id="content" className="mx-auto max-w-(--container-site) px-4 py-12 md:px-6">
      <Breadcrumbs items={[{ href: "/", label: tNav("home") }, { label: tNav("categories") }]} />
      <SectionHeading>{t("all")}</SectionHeading>

      {categories.length === 0 ? (
        <p className="mt-8 text-(--color-text-muted)">{t("noCategories")}</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/category/${category.slug}`} className="group block">
                <div className="overflow-hidden rounded-(--radius-card) border border-(--color-border) transition-colors group-hover:border-(--color-heading)/15">
                  {category.image ? (
                    <MediaThumb
                      media={category.image}
                      aspect="cover"
                      width={800}
                      sizes="(max-width: 640px) 100vw, 280px"
                      className="rounded-none border-0"
                    />
                  ) : (
                    <MediaPlaceholder aspect="cover" className="rounded-none" />
                  )}
                </div>
                <h2 className="mt-3 text-lg font-medium text-(--color-heading)">{category.name}</h2>
                <p className="mt-1 text-sm text-(--color-text-muted)">
                  {t("count", { count: category.productCount })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

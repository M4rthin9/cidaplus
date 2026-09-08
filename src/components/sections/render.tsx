import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MediaPlaceholder, MediaThumb } from "@/components/media/media-thumb";
import { RichText, type MediaLookup } from "@/lib/richtext/render";
import { ProductGrid } from "@/components/site/product-card";
import { PostCardList } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { LineLink } from "@/components/site/line-link";
import { Seal } from "@/components/site/seal";
import type { SectionData } from "@/lib/sections/data";
import type { Section, SectionsValue } from "@/lib/sections/schema";

/**
 * The section renderers. SPEC.md §6, "Homepage section builder".
 *
 * No `server-only` import anywhere in this file or the components it uses, on
 * purpose: a module with no directive is bundled into whichever graph imports
 * it, so the public page renders these on the server with no client JavaScript,
 * and the admin's live preview renders the *same components* in the browser.
 * A preview built from a second set of components previews the wrong thing.
 *
 * Nothing here is interactive — the FAQ is `<details>`, not a JS accordion — so
 * being usable from both graphs costs no bundle on the public side.
 */
const CONTAINER = "mx-auto max-w-(--container-site) px-4 md:px-6";

function Hero({ block, data }: { block: Extract<Section, { type: "hero" }>; data: SectionData }) {
  const t = useTranslations("line");
  const image = block.mediaId ? data.media[block.mediaId] : undefined;

  return (
    <section className="border-b border-(--color-border) bg-(--color-surface)">
      <div
        className={`${CONTAINER} flex flex-col items-start gap-8 py-16 md:flex-row md:items-center md:py-20`}
      >
        {image ? (
          <div className="w-full md:w-2/5">
            <MediaThumb
              media={image}
              aspect="cover"
              width={800}
              sizes="(max-width: 768px) 100vw, 460px"
            />
          </div>
        ) : (
          block.showSeal && <Seal size={140} priority className="shrink-0" />
        )}

        <div>
          {data.organisation && (
            <p className="text-sm text-(--color-text-muted)">{data.organisation}</p>
          )}
          <h1 className="mt-2 text-3xl font-semibold md:text-[40px]">
            {block.headline ?? data.siteName}
          </h1>
          <div className="mt-5 h-0.5 w-16 rounded-full bg-(--color-brand)" aria-hidden="true" />
          {(block.body ?? data.tagline) && (
            <p className="mt-6 max-w-prose text-(--color-text)">{block.body ?? data.tagline}</p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {block.ctaLabel && block.ctaHref && (
              <Link
                href={block.ctaHref}
                className="inline-flex items-center rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
              >
                {block.ctaLabel}
              </Link>
            )}
            <LineLink href={data.lineHref}>{t("openAccount")}</LineLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function ValueProps({ block }: { block: Extract<Section, { type: "value_props" }> }) {
  if (block.items.length === 0) return null;
  return (
    <section className={`${CONTAINER} py-12`}>
      {block.title && <SectionHeading>{block.title}</SectionHeading>}
      <ul
        className={
          block.title
            ? "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {block.items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            {/* Decorative: the text beside it carries the meaning. */}
            <span aria-hidden="true" className="mt-1 text-(--color-accent)">
              ✓
            </span>
            <span className="text-(--color-text)">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeaturedProducts({
  block,
  data,
}: {
  block: Extract<Section, { type: "featured_products" }>;
  data: SectionData;
}) {
  const t = useTranslations("home");
  const products = data.productsByBlock[block.id] ?? [];

  return (
    <section className={`${CONTAINER} py-16`}>
      <SectionHeading
        action={
          <Link
            href="/categories"
            className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
          >
            {t("viewAllProducts")}
          </Link>
        }
      >
        {block.title ?? t("featured")}
      </SectionHeading>
      <div className="mt-8">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="text-(--color-text-muted)">{t("featuredEmpty")}</p>
        )}
      </div>
    </section>
  );
}

function CategoryShowcase({
  block,
  data,
}: {
  block: Extract<Section, { type: "category_showcase" }>;
  data: SectionData;
}) {
  const t = useTranslations("home");
  const tCategory = useTranslations("category");

  // An empty selection means every published top-level category, in their own order.
  const chosen =
    block.categoryIds.length > 0
      ? block.categoryIds.flatMap((id) => data.categories.filter((c) => c.id === id))
      : data.categories;

  return (
    <section className={`${CONTAINER} py-4`}>
      <SectionHeading>{block.title ?? t("browseCategories")}</SectionHeading>
      <div className="mt-8 flex flex-col gap-6">
        {chosen.length === 0 && (
          <p className="text-(--color-text-muted)">{tCategory("noCategories")}</p>
        )}
        {chosen.map((category, index) => (
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
  );
}

function WhyUsGrid({ block }: { block: Extract<Section, { type: "why_us_grid" }> }) {
  if (block.items.length === 0) return null;
  return (
    <section className={`${CONTAINER} py-16`}>
      {block.title && <SectionHeading>{block.title}</SectionHeading>}
      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {block.items.map((item, index) => (
          <li key={index}>
            <h3 className="text-lg font-medium text-(--color-heading)">{item.heading}</h3>
            {item.body && <p className="mt-2 text-(--color-text)">{item.body}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RichTextSection({
  block,
  media,
}: {
  block: Extract<Section, { type: "rich_text" }>;
  media: MediaLookup;
}) {
  return (
    <section className={`${CONTAINER} py-12`}>
      <div className="max-w-prose">
        {block.title && <SectionHeading className="mb-8">{block.title}</SectionHeading>}
        <RichText doc={block.body} media={media} />
      </div>
    </section>
  );
}

function ImageBanner({
  block,
  data,
}: {
  block: Extract<Section, { type: "image_banner" }>;
  data: SectionData;
}) {
  const image = block.mediaId ? data.media[block.mediaId] : undefined;

  return (
    <section className={`${CONTAINER} py-12`}>
      <div className="overflow-hidden rounded-(--radius-card) border border-(--color-border)">
        {image ? (
          <MediaThumb
            media={image}
            aspect="cover"
            width={1600}
            sizes="100vw"
            className="rounded-none border-0"
          />
        ) : (
          <MediaPlaceholder aspect="cover" className="rounded-none" />
        )}
        {(block.headline ?? block.body ?? block.ctaLabel) && (
          /*
           * Text sits below the image, not over it. docs/DESIGN.md sets a hard
           * contrast gate, and text on an arbitrary operator-chosen photograph
           * cannot be guaranteed to clear 4.5:1.
           */
          <div className="bg-(--color-surface) px-6 py-6">
            {block.headline && (
              <h2 className="text-xl font-medium text-(--color-heading)">{block.headline}</h2>
            )}
            {block.body && <p className="mt-2 max-w-prose text-(--color-text)">{block.body}</p>}
            {block.ctaLabel && block.ctaHref && (
              <Link
                href={block.ctaHref}
                className="mt-4 inline-flex items-center rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
              >
                {block.ctaLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LatestPosts({
  block,
  data,
}: {
  block: Extract<Section, { type: "latest_posts" }>;
  data: SectionData;
}) {
  const t = useTranslations("home");
  const tNews = useTranslations("news");
  const posts = data.postsByBlock[block.id] ?? [];

  return (
    <section className={`${CONTAINER} py-16`}>
      <SectionHeading
        action={
          <Link
            href="/news"
            className="text-sm text-(--color-brand) hover:text-(--color-brand-hover)"
          >
            {t("viewAllNews")}
          </Link>
        }
      >
        {block.title ?? t("latestNews")}
      </SectionHeading>
      <div className="mt-8">
        {posts.length > 0 ? (
          <PostCardList posts={posts} />
        ) : (
          <p className="text-(--color-text-muted)">{tNews("empty")}</p>
        )}
      </div>
    </section>
  );
}

function GalleryStrip({
  block,
  data,
}: {
  block: Extract<Section, { type: "gallery_strip" }>;
  data: SectionData;
}) {
  const images = block.mediaIds.flatMap((id) => (data.media[id] ? [data.media[id]] : []));
  if (images.length === 0) return null;

  return (
    <section className={`${CONTAINER} py-12`}>
      {block.title && <SectionHeading className="mb-8">{block.title}</SectionHeading>}
      {/* Scrolls inside itself; the page body never scrolls sideways. */}
      <ul className="flex gap-4 overflow-x-auto pb-2">
        {images.map((image) => (
          <li key={image.id} className="w-44 shrink-0 sm:w-56">
            <MediaThumb media={image} aspect="square" width={400} sizes="224px" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaLine({
  block,
  data,
}: {
  block: Extract<Section, { type: "cta_line" }>;
  data: SectionData;
}) {
  const t = useTranslations("line");
  return (
    <section className={`${CONTAINER} py-12`}>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-(--radius-card) bg-(--color-accent-tint) px-6 py-6">
        <div>
          <h2 className="text-lg font-medium text-(--color-accent-ink)">
            {block.headline ?? t("categoryCta")}
          </h2>
          <p className="mt-1 text-sm text-(--color-accent-ink)">
            {block.body ?? t("categoryCtaBody")}
          </p>
        </div>
        <LineLink href={data.lineHref}>{t("openAccount")}</LineLink>
      </div>
    </section>
  );
}

function FaqAccordion({ block }: { block: Extract<Section, { type: "faq_accordion" }> }) {
  if (block.items.length === 0) return null;
  return (
    <section className={`${CONTAINER} py-12`}>
      {block.title && <SectionHeading className="mb-8">{block.title}</SectionHeading>}
      {/* <details>, not a JS accordion: keyboard-operable and printable for free. */}
      <div className="max-w-prose divide-y divide-(--color-border) border-y border-(--color-border)">
        {block.items.map((item, index) => (
          <details key={index} className="py-4">
            <summary className="cursor-pointer font-medium text-(--color-heading)">
              {item.question}
            </summary>
            <p className="mt-3 text-(--color-text)">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * §6: "Unknown block types render as nothing in production and as a warning in
 * the admin." Production never reaches this — `sanitizeSections` drops what it
 * cannot parse — so this exists for the editor's preview, where the raw type is
 * still known.
 */
function UnknownBlock({ type }: { type: string }) {
  return (
    <div className={`${CONTAINER} py-6`}>
      <p className="rounded-(--radius-card) bg-(--color-brand-tint) px-4 py-3 text-sm text-(--color-brand)">
        ไม่รู้จักบล็อกชนิด “{type}” — จะไม่แสดงบนหน้าเว็บจริง
      </p>
    </div>
  );
}

export function SectionRenderer({
  block,
  data,
  media,
}: {
  block: Section;
  data: SectionData;
  media: MediaLookup;
}) {
  switch (block.type) {
    case "hero":
      return <Hero block={block} data={data} />;
    case "value_props":
      return <ValueProps block={block} />;
    case "featured_products":
      return <FeaturedProducts block={block} data={data} />;
    case "category_showcase":
      return <CategoryShowcase block={block} data={data} />;
    case "why_us_grid":
      return <WhyUsGrid block={block} />;
    case "rich_text":
      return <RichTextSection block={block} media={media} />;
    case "image_banner":
      return <ImageBanner block={block} data={data} />;
    case "latest_posts":
      return <LatestPosts block={block} data={data} />;
    case "gallery_strip":
      return <GalleryStrip block={block} data={data} />;
    case "cta_line":
      return <CtaLine block={block} data={data} />;
    case "faq_accordion":
      return <FaqAccordion block={block} />;
  }
}

export function Sections({ blocks, data }: { blocks: SectionsValue; data: SectionData }) {
  const media: MediaLookup = new Map(Object.entries(data.media));

  return (
    <>
      {blocks
        .filter((block) => block.isVisible)
        .map((block) => (
          <SectionRenderer key={block.id} block={block} data={data} media={media} />
        ))}
    </>
  );
}

export { UnknownBlock };

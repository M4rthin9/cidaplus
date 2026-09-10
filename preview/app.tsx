import { useEffect, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../messages/th.json";
import { Sections, SectionRenderer } from "@/components/sections/render";
import { SiteHeaderView } from "@/components/site/site-header-view";
import { SiteFooterView } from "@/components/site/site-footer-view";
import { ProductGrid } from "@/components/site/product-card";
import { PostCardList } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { MediaPlaceholder } from "@/components/media/media-thumb";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SortLinks } from "@/components/site/sort-links";
import { LineLink } from "@/components/site/line-link";
import { Field } from "@/components/site/field";
import { defaultHomeSections } from "@/lib/pages/default-home";
import type { SectionData } from "@/lib/sections/data";
import { formatPrice } from "@/lib/format";
import { Link, PreviewNavigation, usePreviewNavigate, usePreviewPath } from "./navigation";
import {
  general,
  contact,
  line,
  lineHref,
  categories,
  featured,
  products,
  posts,
  menu,
} from "./data";
import { PREVIEW_SPECS } from "./seed-content";

const data: SectionData = {
  siteName: general.siteName,
  organisation: general.organisation,
  tagline: general.tagline,
  lineHref,
  productsByBlock: { "default-featured": featured },
  postsByBlock: { "default-posts": posts },
  categories,
  media: {},
};
const blocks = defaultHomeSections();

function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} — ${general.siteName}`;
  }, [title]);
  return (
    <main id="content" className="storefront-page site-shell site-section">
      <Breadcrumbs items={[{ label: messages.nav.home, href: "/" }, { label: title }]} />
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function Catalog() {
  const path = usePreviewPath();
  const url = new URL(path, "https://preview.invalid");
  const parts = url.pathname.split("/").filter(Boolean);
  if (path === "/")
    return (
      <main id="content">
        <Sections blocks={blocks} data={data} />
      </main>
    );
  if (parts[0] === "categories")
    return (
      <main id="content">
        <SectionRenderer
          block={{
            id: "preview-categories",
            type: "category_showcase",
            isVisible: true,
            categoryIds: [],
          }}
          data={data}
          media={new Map()}
        />
      </main>
    );
  if (parts[0] === "category") {
    const category = categories.find((c) => c.slug === parts[1]);
    if (!category) return <Missing />;
    const sort = url.searchParams.get("sort") ?? "default";
    const selected = products.filter((p) => p.categoryId === category.id);
    if (sort === "price-asc" || sort === "price-desc")
      selected.sort((a, b) => {
        if (a.price === null) return b.price === null ? 0 : 1;
        if (b.price === null) return -1;
        return sort === "price-asc"
          ? Number(a.price) - Number(b.price)
          : Number(b.price) - Number(a.price);
      });
    if (sort === "newest") selected.reverse();
    const validSort =
      sort === "price-asc" || sort === "price-desc" || sort === "newest" ? sort : "default";
    return (
      <Page title={category.name}>
        <p className="max-w-prose">{category.description}</p>
        <div className="my-8 flex flex-wrap items-center justify-between gap-4">
          <p>{selected.length} รายการ</p>
          <SortLinks basePath={url.pathname} sort={validSort} />
        </div>
        <ProductGrid products={selected} />
      </Page>
    );
  }
  if (parts[0] === "product") {
    const product = products.find((p) => p.slug === parts[1]);
    if (!product) return <Missing />;
    const category = categories.find((c) => c.id === product.categoryId);
    return (
      <Page title={product.name}>
        <div className="grid items-start gap-8 md:grid-cols-2 md:gap-16">
          <MediaPlaceholder aspect="product" label={messages.product.noImage} />
          <div>
            {category && (
              <Link href={`/category/${category.slug}`} className="site-eyebrow">
                {category.name}
              </Link>
            )}
            <h1 className="mt-4 text-3xl font-medium">{product.name}</h1>
            <p className="mt-6 text-2xl text-(--color-heading)">
              {product.price
                ? `${formatPrice(product.price)} บาท`
                : messages.product.contactForPrice}
            </p>
            <p className="mt-6">{product.name} ผลิตโดยผู้เข้ารับการบำบัด ภายใต้โครงการฝึกวิชาชีพ</p>
            <div className="my-8">
              <LineLink href={lineHref}>{line.buttonLabel}</LineLink>
            </div>
            <h2 className="border-t border-(--color-border) pt-6 text-lg">
              {messages.product.specs}
            </h2>
            <dl className="mt-4 divide-y divide-(--color-border)">
              {PREVIEW_SPECS.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 py-3 text-sm">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="mt-16">
          <SectionHeading>{messages.product.related}</SectionHeading>
          <div className="mt-8">
            <ProductGrid
              products={products.filter(
                (p) => p.categoryId === product.categoryId && p.id !== product.id,
              )}
            />
          </div>
        </div>
      </Page>
    );
  }
  if (parts[0] === "news" && parts[1]) {
    const post = posts.find((p) => p.slug === parts[1]);
    if (!post) return <Missing />;
    return (
      <Page title={post.title}>
        <article className="max-w-prose">
          <p className="site-eyebrow">
            {post.type === "event" ? messages.news.event : messages.news.news}
          </p>
          <p className="mt-6 text-lg">{post.excerpt}</p>
          <Link href="/news" className="hero-primary mt-8">
            {messages.news.backToIndex}
          </Link>
        </article>
      </Page>
    );
  }
  if (parts[0] === "news")
    return (
      <Page title={messages.news.title}>
        <PostCardList posts={posts} />
      </Page>
    );
  if (parts[0] === "search") return <SearchPage query={url.searchParams.get("q") ?? ""} />;
  if (parts[0] === "contact") return <ContactPreview />;
  if (parts[0] === "preview" && parts[1] === "line")
    return (
      <Page title="สอบถามทาง LINE">
        <p className="max-w-prose">
          หน้านี้เป็นตัวอย่างการออกแบบ ปุ่ม LINE
          บนเว็บไซต์จริงจะเปิดบัญชีของหน่วยงานและส่งต่อข้อมูลสินค้าที่สนใจตามการตั้งค่าในระบบ
        </p>
        <Link href="/categories" className="hero-primary mt-6">
          กลับไปเลือกชมผลิตภัณฑ์
        </Link>
      </Page>
    );
  return <Missing />;
}

function SearchPage({ query }: { query: string }) {
  const navigate = usePreviewNavigate();
  const matchingProducts = query ? products.filter((p) => p.name.includes(query)) : [];
  const matchingPosts = query ? posts.filter((p) => `${p.title} ${p.excerpt}`.includes(query)) : [];
  return (
    <Page title={messages.search.title}>
      <form
        className="flex max-w-2xl gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          navigate(`/search?q=${encodeURIComponent(q)}`);
        }}
      >
        <label htmlFor="preview-search" className="sr-only">
          {messages.search.placeholder}
        </label>
        <input
          id="preview-search"
          key={query}
          name="q"
          defaultValue={query}
          className="min-w-0 flex-1 border border-(--color-border) bg-(--color-surface) px-4 py-3"
          placeholder={messages.search.placeholder}
        />
        <button type="submit" className="hero-primary">
          {messages.search.submit}
        </button>
      </form>
      <div className="mt-8" role="status">
        {query ? `ผลการค้นหาสำหรับ “${query}”` : messages.search.prompt}
      </div>
      {matchingProducts.length > 0 && (
        <div className="mt-8">
          <ProductGrid products={matchingProducts} />
        </div>
      )}
      {matchingPosts.length > 0 && (
        <div className="mt-12">
          <PostCardList posts={matchingPosts} />
        </div>
      )}
      {query && !matchingProducts.length && !matchingPosts.length && (
        <p className="mt-4">{messages.search.empty}</p>
      )}
    </Page>
  );
}

function ContactPreview() {
  const [shown, setShown] = useState(false);
  return (
    <Page title={messages.contact.title}>
      <p>{messages.contact.intro}</p>
      <div className="mt-10 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-xl">{general.siteName}</h2>
          <p className="mt-3">{general.organisation}</p>
          <LineLink href={lineHref} className="mt-6">
            {line.buttonLabel}
          </LineLink>
        </div>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            setShown(true);
          }}
        >
          <h2 className="text-xl">{messages.contact.formTitle}</h2>
          <p className="text-sm">แบบฟอร์มตัวอย่าง ไม่มีการส่งหรือบันทึกข้อมูล</p>
          <Field name="name" label={messages.contact.name} required>
            {(p) => <input {...p} autoComplete="name" />}
          </Field>
          <Field name="email" label={messages.contact.emailField} required>
            {(p) => <input {...p} type="email" autoComplete="email" />}
          </Field>
          <Field name="subject" label={messages.contact.subject} required>
            {(p) => <input {...p} />}
          </Field>
          <Field name="message" label={messages.contact.message} required>
            {(p) => <textarea {...p} rows={4} />}
          </Field>
          <button type="submit" className="hero-primary">
            ทดสอบแบบฟอร์ม
          </button>
          {shown && (
            <p role="status">ตัวอย่างการตรวจสอบแบบฟอร์มเสร็จสมบูรณ์ ข้อมูลไม่ได้ถูกส่งหรือบันทึก</p>
          )}
        </form>
      </div>
    </Page>
  );
}
function Missing() {
  return (
    <Page title="ไม่พบหน้าที่ต้องการ">
      <Link href="/" className="hero-primary">
        กลับสู่หน้าแรก
      </Link>
    </Page>
  );
}

export function PreviewApp({ initialPath = "/" }: { initialPath?: string }) {
  return (
    <NextIntlClientProvider
      locale="th"
      messages={messages}
      timeZone="Asia/Bangkok"
      now={new Date("2026-09-10T00:00:00Z")}
    >
      <PreviewNavigation initialPath={initialPath}>
        <div className="preview-notice">
          ตัวอย่างการออกแบบ · ข้อมูลและราคาเป็นตัวอย่างจากโครงการ
        </div>
        <a href="#content" className="preview-skip">
          {messages.nav.skipToContent}
        </a>
        <SiteHeaderView
          general={general}
          contact={contact}
          line={line}
          items={menu}
          locales={[{ code: "th", label: "ไทย", isDefault: true }]}
          lineHref={lineHref}
        />
        <Catalog />
        <SiteFooterView
          general={general}
          contact={contact}
          line={line}
          links={menu.filter((m) => m.id !== "home")}
          lineHref={lineHref}
        />
        <div className="preview-mobile-line">
          <LineLink href={lineHref}>{line.buttonLabel}</LineLink>
        </div>
      </PreviewNavigation>
    </NextIntlClientProvider>
  );
}

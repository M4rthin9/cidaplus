import type { CategoryCardData, ProductCardData, PostCardData } from "@/lib/public/queries";
import type { MenuItems } from "@/lib/menus/schema";
import { defaultsFor } from "@/lib/settings/registry";
import { PREVIEW_CATEGORIES, PREVIEW_POSTS } from "./seed-content";

export const general = defaultsFor("general");
export const contact = defaultsFor("contact");
export const line = defaultsFor("line");
export const theme = defaultsFor("theme");
export const lineHref = "/preview/line";
export const categories: CategoryCardData[] = PREVIEW_CATEGORIES.map((c) => ({
  id: c.slug,
  slug: c.slug,
  name: c.name,
  description: c.description,
  image: null,
  productCount: c.products.length,
}));
export const products: ProductCardData[] = PREVIEW_CATEGORIES.flatMap((c) =>
  c.products.map((name, i) => ({
    id: `${c.slug}-${i + 1}`,
    categoryId: c.slug,
    slug: `${c.slug}-${i + 1}`,
    name,
    price: i % 4 === 3 ? null : String((i + 2) * 250),
    priceDisplay: i % 4 === 3 ? ("contact" as const) : ("exact" as const),
    image: null,
  })),
);
export const featured = categories.flatMap((c) =>
  products.filter((p) => p.categoryId === c.id).slice(0, 1),
);
export const posts: PostCardData[] = PREVIEW_POSTS.map((p) => ({
  id: p.slug,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  type: p.type,
  publishedAt: new Date("2026-02-01T00:00:00Z"),
  eventStartAt: "eventStartAt" in p && p.eventStartAt ? new Date(p.eventStartAt) : null,
  cover: null,
}));
export const menu: MenuItems = [
  { id: "home", label: "หน้าแรก", href: "/", target: "self", children: [] },
  {
    id: "categories",
    label: "หมวดหมู่สินค้า",
    href: "/categories",
    target: "self",
    children: categories.map((c) => ({
      id: c.id,
      label: c.name,
      href: `/category/${c.slug}`,
      target: "self",
    })),
  },
  { id: "news", label: "ข่าวและกิจกรรม", href: "/news", target: "self", children: [] },
  { id: "contact", label: "ติดต่อเรา", href: "/contact", target: "self", children: [] },
];
export const routes = [
  "/",
  "/categories",
  "/news",
  "/contact",
  "/search",
  "/preview/line",
  ...categories.map((c) => `/category/${c.slug}`),
  ...products.map((p) => `/product/${p.slug}`),
  ...posts.map((p) => `/news/${p.slug}`),
];

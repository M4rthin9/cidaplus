import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { priceDisplay } from "./enums";
import { localeColumn } from "./locales";
import { media } from "./media";
import { categories } from "./categories";
import { primaryId, seedFlag, softDelete, timestamps } from "./shared";

export const products = pgTable("products", {
  id: primaryId(),
  categoryId: varchar("category_id", { length: 36 })
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  /** numeric, not float — money must not drift. Null when price_display is contact/hidden. */
  price: numeric("price", { precision: 12, scale: 2 }),
  priceDisplay: priceDisplay("price_display").notNull().default("exact"),
  sku: varchar("sku", { length: 64 }),
  badge: varchar("badge", { length: 64 }),
  /** Overrides settings.line.message_template for this product only (SPEC.md §8). */
  lineMessageOverride: text("line_message_override"),
  sortOrder: integer("sort_order").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  /**
   * Public queries filter on `is_published AND published_at <= now()` (SPEC.md §9),
   * which is what makes "scheduled" a state without a third column.
   */
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ogMediaId: varchar("og_media_id", { length: 36 }).references(() => media.id, {
    onDelete: "set null",
  }),
  ...seedFlag,
  ...softDelete,
  ...timestamps,
});

export const productI18n = pgTable(
  "product_i18n",
  {
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    slug: varchar("slug", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    shortDesc: text("short_desc"),
    /** Tiptap JSON. Sanitised server-side before storing (CLAUDE.md). */
    body: jsonb("body"),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.locale] }),
    unique("product_i18n_locale_slug_key").on(t.locale, t.slug),
  ],
);

export const productMedia = pgTable(
  "product_media",
  {
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: varchar("media_id", { length: 36 })
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.productId, t.mediaId] })],
);

/** Size, material, colour… — the label and value are both translatable. */
export const productSpecs = pgTable("product_specs", {
  id: primaryId(),
  productId: varchar("product_id", { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const productSpecI18n = pgTable(
  "product_spec_i18n",
  {
    specId: varchar("spec_id", { length: 36 })
      .notNull()
      .references(() => productSpecs.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    label: varchar("label", { length: 255 }).notNull(),
    value: text("value").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.specId, t.locale] })],
);

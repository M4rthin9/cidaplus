import { boolean, integer, pgTable, primaryKey, text, unique, varchar } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { localeColumn } from "./locales";
import { media } from "./media";
import { primaryId, seedFlag, softDelete, timestamps } from "./shared";

/**
 * Non-translatable data only (SPEC.md §6): media, publish state, sort order,
 * nesting. Anything a human reads lives in `category_i18n`.
 * Publish state is global, never per-locale.
 */
export const categories = pgTable("categories", {
  id: primaryId(),
  parentId: varchar("parent_id", { length: 36 }).references((): AnyPgColumn => categories.id, {
    onDelete: "restrict",
  }),
  heroMediaId: varchar("hero_media_id", { length: 36 }).references(() => media.id, {
    onDelete: "set null",
  }),
  iconMediaId: varchar("icon_media_id", { length: 36 }).references(() => media.id, {
    onDelete: "set null",
  }),
  ogMediaId: varchar("og_media_id", { length: 36 }).references(() => media.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  ...seedFlag,
  ...softDelete,
  ...timestamps,
});

export const categoryI18n = pgTable(
  "category_i18n",
  {
    categoryId: varchar("category_id", { length: 36 })
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    /** Per-locale, so a Thai slug and an English slug can coexist. */
    slug: varchar("slug", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    unique("category_i18n_locale_slug_key").on(t.locale, t.slug),
  ],
);

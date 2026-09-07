import { boolean, jsonb, pgTable, primaryKey, text, unique, varchar } from "drizzle-orm/pg-core";
import { menuLocation } from "./enums";
import { localeColumn } from "./locales";
import { primaryId, timestamps } from "./shared";

/** Static pages plus the homepage. `key` is the stable handle: home, about, … */
export const pages = pgTable("pages", {
  id: primaryId(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  isPublished: boolean("is_published").notNull().default(false),
  ...timestamps,
});

export const pageI18n = pgTable(
  "page_i18n",
  {
    pageId: varchar("page_id", { length: 36 })
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    /**
     * Ordered array of discriminated-union blocks (SPEC.md §6). The Zod schemas
     * and renderers arrive in phase 9; the column is untyped jsonb until then.
     */
    sections: jsonb("sections").notNull().default([]),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.pageId, t.locale] }),
    unique("page_i18n_locale_slug_key").on(t.locale, t.slug),
  ],
);

export const menus = pgTable("menus", {
  id: primaryId(),
  location: menuLocation("location").notNull().unique(),
  ...timestamps,
});

export const menuI18n = pgTable(
  "menu_i18n",
  {
    menuId: varchar("menu_id", { length: 36 })
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    locale: localeColumn(),
    /** {label, href, children[], target} tree. Typed in phase 9. */
    items: jsonb("items").notNull().default([]),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.menuId, t.locale] })],
);

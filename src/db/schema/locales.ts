import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./shared";

/**
 * The set of languages the site knows about. Adding a language is a row insert,
 * never a migration (SPEC.md §6) — every `*_i18n` table references this code.
 *
 * v1 ships Thai only (SPEC.md §14 decision 9): `en` and `zh-Hans` exist as rows
 * with `isEnabled = false` so the schema and the fallback path are already real.
 */
export const locales = pgTable("locales", {
  code: varchar("code", { length: 16 }).primaryKey(),
  labelNative: varchar("label_native", { length: 64 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Reusable FK column for every `*_i18n` table. */
export const localeColumn = () =>
  varchar("locale", { length: 16 })
    .notNull()
    .references(() => locales.code, { onDelete: "restrict", onUpdate: "cascade" });

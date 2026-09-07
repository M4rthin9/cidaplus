/**
 * Phase 1 verification (SPEC.md §12): "an English page request falls back to Thai."
 *
 * There is no public site until phase 7, so this exercises the rule against the
 * real database — the same resolver the pages will use.
 */
import { asc, eq } from "drizzle-orm";
import { db, sql } from "../src/db/client";
import { categories, categoryI18n, productI18n, products } from "../src/db/schema";
import { resolveTranslation } from "../src/db/i18n";

async function main() {
  const rows = await db
    .select({
      categoryId: categories.id,
      sortOrder: categories.sortOrder,
      locale: categoryI18n.locale,
      slug: categoryI18n.slug,
      name: categoryI18n.name,
    })
    .from(categories)
    .innerJoin(categoryI18n, eq(categoryI18n.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder));

  const byCategory = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = byCategory.get(row.categoryId) ?? [];
    bucket.push(row);
    byCategory.set(row.categoryId, bucket);
  }

  console.warn("\nCategory listing requested as locale = 'en' (no English rows exist):\n");
  const table: Record<string, string>[] = [];
  for (const [, bucket] of byCategory) {
    const resolved = resolveTranslation(bucket, "en");
    if (!resolved) throw new Error("category has no translations at all");
    if (resolved.row.name.trim().length === 0) throw new Error("resolved to an empty string");
    table.push({
      requested: "en",
      rendered: resolved.locale,
      fallback: resolved.isFallback ? "yes" : "no",
      name: resolved.row.name,
      slug: resolved.row.slug,
    });
  }
  console.table(table);

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .orderBy(asc(products.sortOrder))
    .limit(1);
  if (!product) throw new Error("no seeded products");

  const productRows = await db
    .select({ locale: productI18n.locale, name: productI18n.name })
    .from(productI18n)
    .where(eq(productI18n.productId, product.id));

  const th = resolveTranslation(productRows, "th");
  const en = resolveTranslation(productRows, "en");
  const zh = resolveTranslation(productRows, "zh-Hans");

  console.warn("\nSame product resolved across all three locales:\n");
  console.table([
    { requested: "th", rendered: th?.locale, fallback: th?.isFallback, name: th?.row.name },
    { requested: "en", rendered: en?.locale, fallback: en?.isFallback, name: en?.row.name },
    { requested: "zh-Hans", rendered: zh?.locale, fallback: zh?.isFallback, name: zh?.row.name },
  ]);

  const ok =
    th?.isFallback === false &&
    en?.isFallback === true &&
    zh?.isFallback === true &&
    en?.locale === "th" &&
    zh?.locale === "th";

  console.warn(`\nFallback rule holds: ${ok ? "YES" : "NO"}\n`);
  if (!ok) throw new Error("fallback rule violated");
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await sql.end();
    process.exit(1);
  });

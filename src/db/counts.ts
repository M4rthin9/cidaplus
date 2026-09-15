import { and, eq, isNull, lte, sql, type Column, type SQL } from "drizzle-orm";
import { db } from "./client";
import { lineClicks, productMedia, products } from "./schema";

/** Either a literal id or, in a correlated subquery, the outer query's column. */
type IdRef = Column | SQL<unknown> | string;

/**
 * Correlated `count(*)` subqueries, in one place and built through the query
 * builder rather than as a raw `sql` template.
 *
 * Drizzle emits a column interpolated into a `sql` template **unqualified**
 * when that template sits in a select-field position, so
 *
 *     sql`(select count(*) from ${products} where ${products.categoryId} = ${categories.id})`
 *
 * compiles to `where "category_id" = "id"` — and inside the subquery Postgres
 * resolves both names against `products`, comparing `products.category_id` to
 * `products.id`. That is never true, so the count is silently 0 rather than an
 * error. The same expression built with `db.select().from().where()` goes
 * through the where-clause path, which does qualify: `"products"."category_id"
 * = "categories"."id"`. `counts.test.ts` asserts the qualification on each
 * expression below, because the failure mode is wrong data, not a crash.
 */

/** Products a visitor can see in a category — published, live and not deleted. */
export function liveProductCountFor(categoryId: IdRef): SQL<number> {
  return sql<number>`(${db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(
      and(
        eq(products.categoryId, categoryId),
        eq(products.isPublished, true),
        lte(products.publishedAt, sql`now()`),
        isNull(products.deletedAt),
      ),
    )})`;
}

/** Every product filed under a category, drafts included — the admin's view. */
export function productCountFor(categoryId: IdRef): SQL<number> {
  return sql<number>`(${db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt)))})`;
}

/** Images attached to a product. */
export function productImageCountFor(productId: IdRef): SQL<number> {
  return sql<number>`(${db
    .select({ n: sql<number>`count(*)::int` })
    .from(productMedia)
    .where(eq(productMedia.productId, productId))})`;
}

/** LINE clicks attributed to a product within the retention window (SPEC.md §8 item 5). */
export function productClickCountFor(productId: IdRef, days: number): SQL<number> {
  return sql<number>`(${db
    .select({ n: sql<number>`count(*)::int` })
    .from(lineClicks)
    .where(
      and(
        eq(lineClicks.productId, productId),
        sql`${lineClicks.createdAt} >= now() - make_interval(days => ${days})`,
      ),
    )})`;
}

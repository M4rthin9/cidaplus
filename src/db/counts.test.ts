import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { categories, products } from "./schema";
import {
  liveProductCountFor,
  productClickCountFor,
  productCountFor,
  productImageCountFor,
} from "./counts";

/**
 * These assert compiled SQL, not results, because the bug they guard against
 * produced neither an error nor a crash — just a silently wrong number. A
 * correlated subquery whose join condition compiles to bare `"category_id" =
 * "id"` is resolved entirely inside the subquery, so it is always false and the
 * count is always 0. See the note in counts.ts.
 */

function compile(expression: ReturnType<typeof liveProductCountFor>): string {
  return db.select({ n: expression }).from(categories).toSQL().sql;
}

describe("correlated count expressions", () => {
  it("qualifies both sides of the category correlation", () => {
    const query = compile(liveProductCountFor(categories.id));
    expect(query).toContain('"products"."category_id" = "categories"."id"');
    expect(query).not.toMatch(/"category_id" = "id"/);
  });

  it("qualifies the admin category count and keeps soft-deleted rows out", () => {
    const query = compile(productCountFor(categories.id));
    expect(query).toContain('"products"."category_id" = "categories"."id"');
    expect(query).toContain('"products"."deleted_at" is null');
  });

  it("qualifies the product image count", () => {
    const query = db
      .select({ n: productImageCountFor(products.id) })
      .from(products)
      .toSQL().sql;
    expect(query).toContain('"product_media"."product_id" = "products"."id"');
  });

  it("qualifies the product click count and windows it", () => {
    const { sql: query, params } = db
      .select({ n: productClickCountFor(products.id, 30) })
      .from(products)
      .toSQL();
    expect(query).toContain('"line_clicks"."product_id" = "products"."id"');
    expect(query).toContain("make_interval(days =>");
    expect(params).toContain(30);
  });

  it("only counts live products for the public site", () => {
    const query = compile(liveProductCountFor(categories.id));
    expect(query).toContain('"products"."is_published"');
    expect(query).toContain('"products"."published_at" <= now()');
    expect(query).toContain('"products"."deleted_at" is null');
  });

  it("still accepts a plain id, so the helpers work outside a correlation", () => {
    const query = db
      .select({ n: liveProductCountFor("cat-1") })
      .from(categories)
      .toSQL();
    expect(query.sql).toContain('"products"."category_id" =');
    expect(query.params).toContain("cat-1");
  });

  it("documents the raw-template failure these helpers replace", () => {
    const broken = db
      .select({
        n: sql<number>`(select count(*)::int from ${products} where ${products.categoryId} = ${categories.id})`,
      })
      .from(categories)
      .toSQL().sql;
    // Kept as an executable record of the gotcha: drizzle drops the table
    // qualifier for a column interpolated into a select-field `sql` template.
    expect(broken).toContain('"category_id" = "id"');
  });
});

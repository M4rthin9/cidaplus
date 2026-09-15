import { inArray, like } from "drizzle-orm";
import { db, sql } from "../src/db/client";
import { postI18n, posts, productI18n, products } from "../src/db/schema";

/** Deletes the rows the e2e suite created. Invoked by e2e/global-teardown.ts. */
async function main() {
  const productIds = await db
    .select({ id: productI18n.productId })
    .from(productI18n)
    .where(like(productI18n.slug, "e2e-%"));
  if (productIds.length > 0) {
    await db.delete(products).where(
      inArray(
        products.id,
        productIds.map((r) => r.id),
      ),
    );
  }

  const postIds = await db
    .select({ id: postI18n.postId })
    .from(postI18n)
    .where(like(postI18n.slug, "e2e-%"));
  if (postIds.length > 0) {
    await db.delete(posts).where(
      inArray(
        posts.id,
        postIds.map((r) => r.id),
      ),
    );
  }

  await sql.end();
}

void main();

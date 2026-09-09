import "server-only";

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { lineClicks, productI18n, products } from "@/db/schema";
import { DEFAULT_LOCALE } from "@/lib/slug";

/**
 * The LINE click log. SPEC.md §8 item 5: "This is the only conversion signal the
 * business has — it matters."
 *
 * A row carries the product, the path, the referrer and a hashed user-agent —
 * no raw IP and no cookie, so nothing here identifies a visitor. `locale` is
 * recorded so the operator knows which language the enquiry will arrive in
 * before they reply (§8 item 4).
 */

/** §6: nothing reads past 30 days. Every query below shares this window. */
export const RETENTION_DAYS = 30;

/**
 * Recording a click must never stop the redirect. The visitor is mid-journey to
 * the Official Account; losing the analytics row is a bad day, and stranding
 * them on an error page instead of the chat is a lost sale.
 */
export async function recordLineClick(entry: {
  productId: string | null;
  locale: string;
  path: string;
  referrer: string | null;
  uaHash: string | null;
}): Promise<boolean> {
  try {
    await db.insert(lineClicks).values({
      productId: entry.productId,
      locale: entry.locale,
      path: entry.path.slice(0, 512),
      referrer: entry.referrer?.slice(0, 512) ?? null,
      uaHash: entry.uaHash,
    });
    return true;
  } catch (error) {
    console.error("[line] failed to record click:", error);
    return false;
  }
}

export type DailyClicks = { day: string; clicks: number };

/**
 * One row per day for the window, including days with no clicks.
 *
 * `generate_series` supplies the empty days rather than the chart filling them
 * in: a gap in the x-axis is a different claim from a zero, and only the
 * database knows which days actually exist in the window.
 */
export async function clicksByDay(days = RETENTION_DAYS): Promise<DailyClicks[]> {
  const rows = await db.execute<{ day: string; clicks: number }>(sql`
    select
      to_char(d.day, 'YYYY-MM-DD') as day,
      coalesce(count(${lineClicks.id}), 0)::int as clicks
    from generate_series(
      (now() at time zone 'Asia/Bangkok')::date - ${days - 1}::int,
      (now() at time zone 'Asia/Bangkok')::date,
      '1 day'
    ) as d(day)
    left join ${lineClicks}
      on (${lineClicks.createdAt} at time zone 'Asia/Bangkok')::date = d.day
    group by d.day
    order by d.day
  `);

  return [...rows].map((r) => ({ day: r.day, clicks: Number(r.clicks) }));
}

export type ProductClicks = { productId: string; name: string; slug: string; clicks: number };

/** Per-product totals for the window, for the dashboard and the product table. */
export async function clicksByProduct(days = RETENTION_DAYS): Promise<ProductClicks[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return db
    .select({
      productId: products.id,
      name: productI18n.name,
      slug: productI18n.slug,
      clicks: sql<number>`count(${lineClicks.id})::int`,
    })
    .from(lineClicks)
    .innerJoin(products, eq(products.id, lineClicks.productId))
    .innerJoin(
      productI18n,
      and(eq(productI18n.productId, products.id), eq(productI18n.locale, DEFAULT_LOCALE)),
    )
    .where(and(gte(lineClicks.createdAt, since), isNull(products.deletedAt)))
    .groupBy(products.id, productI18n.name, productI18n.slug)
    .orderBy(desc(sql`count(${lineClicks.id})`));
}

export type ClickTotals = {
  window: number;
  lastSevenDays: number;
  /** Clicks with no product: the header, footer and contact-page entry points. */
  unattributed: number;
};

export async function clickTotals(days = RETENTION_DAYS): Promise<ClickTotals> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  /**
   * An ISO string with an explicit cast, not a `Date`. Inside a raw `sql`
   * fragment drizzle has no column type to infer the parameter from, so
   * postgres.js is handed a `Date` where it expects a string and the whole
   * query fails at bind time. A `Date` in `where()` is fine — that path is typed
   * by the column.
   */
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [row] = await db
    .select({
      window: sql<number>`count(*)::int`,
      lastSevenDays: sql<number>`count(*) filter (where ${lineClicks.createdAt} >= ${sevenDaysAgo}::timestamptz)::int`,
      unattributed: sql<number>`count(*) filter (where ${lineClicks.productId} is null)::int`,
    })
    .from(lineClicks)
    .where(gte(lineClicks.createdAt, since));

  return {
    window: row?.window ?? 0,
    lastSevenDays: row?.lastSevenDays ?? 0,
    unattributed: row?.unattributed ?? 0,
  };
}

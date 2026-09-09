import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { db } from "@/db/client";
import { productI18n, products } from "@/db/schema";
import { resolveTranslation } from "@/db/i18n";
import { routing } from "@/i18n/routing";
import { recordLineClick } from "@/lib/clicks";
import { assertEnv } from "@/lib/env";
import { addFriendUrl, oaMessageUrl, renderMessageTemplate } from "@/lib/line";
import { pepperedHash } from "@/lib/privacy";
import { getSetting } from "@/lib/settings/store";
import { DEFAULT_LOCALE, productPath } from "@/lib/slug";

/**
 * `/go/line` — the tracked entry point to the Official Account. SPEC.md §8.
 *
 * It lives under `[locale]` so the locale is a route segment rather than a
 * query parameter the caller could forget: Thai resolves at `/go/line` and any
 * other locale at `/<locale>/go/line`, matching the as-needed prefix scheme
 * (§14 decision 21). §8 item 4 wants the visitor's locale on the row, and this
 * is the only way to get it that cannot silently default.
 *
 * The redirect is a 302, not a 301: the target is derived from `settings.line`
 * and a permanently-cached redirect would survive the operator changing the
 * account.
 */
export const dynamic = "force-dynamic";

function sitePath(referrer: string | null, request: NextRequest): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.origin === request.nextUrl.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

async function resolveProduct(locale: string, slug: string) {
  const localeSet = locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];

  const rows = await db
    .select({
      productId: productI18n.productId,
      locale: productI18n.locale,
      name: productI18n.name,
      slug: productI18n.slug,
      override: products.lineMessageOverride,
    })
    .from(productI18n)
    .innerJoin(products, eq(products.id, productI18n.productId))
    .where(
      and(
        eq(productI18n.slug, slug),
        inArray(productI18n.locale, localeSet),
        eq(products.isPublished, true),
        lte(products.publishedAt, sql`now()`),
        isNull(products.deletedAt),
      ),
    );

  return resolveTranslation(rows, locale)?.row ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;

  const slug = request.nextUrl.searchParams.get("p");
  const line = await getSetting("line", locale);

  const product = slug ? await resolveProduct(locale, decodeURIComponent(slug)) : null;

  /**
   * With a product, open a chat carrying the pre-filled message; without one —
   * the header, footer and contact-page entry points — offer the add-friend
   * link, which is the right action when there is nothing to ask about yet.
   */
  let target: string;
  if (product) {
    const template = product.override?.trim() || line.messageTemplate;
    const url = new URL(
      productPath(locale, product.slug),
      assertEnv().NEXT_PUBLIC_SITE_URL,
    ).toString();
    target = oaMessageUrl(
      line.oaId,
      renderMessageTemplate(template, {
        product_name: product.name,
        product_url: url,
      }),
    );
  } else {
    target = addFriendUrl(line.oaId);
  }

  /**
   * Recorded before redirecting (§8 item 5). A hashed user-agent, no raw IP and
   * no cookie: enough to spot a bot hammering the endpoint, not enough to
   * follow a person.
   */
  const ua = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");

  /**
   * `path` is the referring page reduced to a site-relative path, so the
   * operator can group by it ("how many enquiries came off the category
   * pages?"); `referrer` keeps the header verbatim, which is where a campaign
   * query string would survive. Same-origin only — an off-site referrer is not
   * a page of ours and is recorded as the endpoint itself.
   */
  await recordLineClick({
    productId: product?.productId ?? null,
    locale,
    path: sitePath(referrer, request) ?? request.nextUrl.pathname,
    referrer,
    uaHash: ua ? pepperedHash(ua) : null,
  });

  /**
   * §8 item 5 also asks for a GA4 event. That is deliberately not fired here:
   * this is a server redirect with no client to run gtag on, and §10 requires
   * analytics to load only after PDPA consent — which is phase 10's banner. The
   * `line_clicks` row above is the durable signal either way.
   */
  return NextResponse.redirect(target, { status: 302 });
}

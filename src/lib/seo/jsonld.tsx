import { absoluteUrl, encodePath } from "./urls";

/**
 * Structured data. SPEC.md §10 names four types: `Organization`,
 * `BreadcrumbList`, `Product` (with `offers.availability` omitted, since there
 * is no online purchase) and `Article` for posts.
 *
 * Every builder returns a plain object and `JsonLd` serialises it. Nothing here
 * interpolates a string into markup, so a product name containing `</script>`
 * cannot close the tag — the escape below is the belt to that braces.
 */
type Json = Record<string, unknown>;

/**
 * CLAUDE.md forbids `dangerouslySetInnerHTML` **on stored content**, and this is
 * not that: the string is JSON this module serialised from typed objects a
 * moment earlier, never markup out of the database. React escapes a `<script>`
 * element's text children, which would turn `<` into `&lt;` inside the JSON and
 * break every parser, so this is the one correct way to emit JSON-LD.
 *
 * `<` is still escaped as `\u003c` — valid JSON that parses back to the same
 * string — so a product name containing `</script>` cannot close the element.
 */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // The content is JSON we serialised ourselves, not stored markup.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export function organisationJsonLd(input: {
  base: string;
  locale: string;
  siteName: string;
  organisation?: string;
  logoUrl: string;
  phone?: string;
  email?: string;
  address?: string;
  sameAs: string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.siteName,
    url: absoluteUrl(input.base, input.locale, "/"),
    logo: `${input.base.replace(/\/+$/, "")}${input.logoUrl}`,
    ...(input.organisation
      ? { parentOrganization: { "@type": "Organization", name: input.organisation } }
      : {}),
    ...(input.address
      ? { address: { "@type": "PostalAddress", streetAddress: input.address } }
      : {}),
    ...(input.phone || input.email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(input.phone ? { telephone: input.phone } : {}),
            ...(input.email ? { email: input.email } : {}),
          },
        }
      : {}),
    ...(input.sameAs.length > 0 ? { sameAs: input.sameAs } : {}),
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(base: string, locale: string, crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(base, locale, encodePath(crumb.path)),
    })),
  };
}

export function productJsonLd(input: {
  base: string;
  locale: string;
  name: string;
  description?: string;
  path: string;
  images: string[];
  sku?: string;
  price?: string;
  priceDisplay: "exact" | "from" | "contact" | "hidden";
  categoryName?: string;
}): Json {
  const origin = input.base.replace(/\/+$/, "");

  /**
   * §10: "`Product` (with `offers.availability` omitted since there is no
   * online purchase)". An `Offer` is still the only way to state a price, so it
   * is emitted when there is a real one — with `url` pointing at the product
   * page rather than a checkout, and no availability claim. `contact` and
   * `hidden` products carry no offer at all: inventing one would be a public
   * claim about a price nobody published.
   */
  const hasPrice = input.priceDisplay === "exact" && Boolean(input.price);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: absoluteUrl(input.base, input.locale, encodePath(input.path)),
    ...(input.images.length > 0 ? { image: input.images.map((i) => `${origin}${i}`) } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.categoryName ? { category: input.categoryName } : {}),
    ...(hasPrice
      ? {
          offers: {
            "@type": "Offer",
            price: input.price,
            priceCurrency: "THB",
            url: absoluteUrl(input.base, input.locale, encodePath(input.path)),
          },
        }
      : {}),
  };
}

export function articleJsonLd(input: {
  base: string;
  locale: string;
  headline: string;
  description?: string;
  path: string;
  image?: string;
  publishedAt?: Date | null;
  siteName: string;
}): Json {
  const origin = input.base.replace(/\/+$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    mainEntityOfPage: absoluteUrl(input.base, input.locale, encodePath(input.path)),
    ...(input.image ? { image: [`${origin}${input.image}`] } : {}),
    ...(input.publishedAt ? { datePublished: input.publishedAt.toISOString() } : {}),
    inLanguage: input.locale,
    publisher: { "@type": "Organization", name: input.siteName },
  };
}

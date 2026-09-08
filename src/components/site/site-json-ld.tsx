import { getLocale } from "next-intl/server";
import { assertEnv } from "@/lib/env";
import { getCachedSetting } from "@/lib/settings/cached";
import { addFriendUrl } from "@/lib/line";
import { JsonLd, organisationJsonLd } from "@/lib/seo/jsonld";

/**
 * The site-wide `Organization` node (SPEC.md §10), rendered once per page from
 * the same settings the footer shows — so the structured data and the visible
 * contact block cannot drift apart.
 *
 * `sameAs` carries the LINE account and any social URLs the operator has set.
 * The LINE URL is built by `src/lib/line.ts` like every other reference to it,
 * and points at the account rather than at `/go/line`: a redirect is not an
 * identity.
 */
export async function SiteJsonLd() {
  const locale = await getLocale();
  const [general, contact, line] = await Promise.all([
    getCachedSetting("general", locale),
    getCachedSetting("contact", locale),
    getCachedSetting("line", locale),
  ]);

  const sameAs = [addFriendUrl(line.oaId), contact.facebookUrl, contact.youtubeUrl].filter(
    (url): url is string => Boolean(url),
  );

  return (
    <JsonLd
      data={organisationJsonLd({
        base: assertEnv().NEXT_PUBLIC_SITE_URL,
        locale,
        siteName: general.siteName,
        organisation: general.organisation,
        logoUrl: "/brand/seal-420.png",
        phone: contact.phone,
        email: contact.email,
        address: general.address,
        sameAs,
      })}
    />
  );
}

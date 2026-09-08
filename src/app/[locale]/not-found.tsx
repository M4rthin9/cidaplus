import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCachedSetting } from "@/lib/settings/cached";
import { addFriendUrl } from "@/lib/line";
import { LineLink } from "@/components/site/line-link";

/**
 * Custom 404 in Thai with a LINE entry point (SPEC.md §10). A dead end on a
 * catalog site is a lost enquiry, so the page offers both a way back and a way
 * to ask a human.
 */
export default async function NotFound() {
  const t = await getTranslations("error");
  const tLine = await getTranslations("line");
  const line = await getCachedSetting("line");

  return (
    <main id="content" className="mx-auto max-w-(--container-site) px-4 py-24 md:px-6">
      <p className="lat text-sm text-(--color-text-muted)">404</p>
      <h1 className="mt-2 text-3xl font-semibold md:text-[40px]">{t("notFoundTitle")}</h1>
      <div className="mt-4 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
      <p className="mt-6 max-w-prose text-(--color-text)">{t("notFoundBody")}</p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
        >
          {t("backHome")}
        </Link>
        <LineLink href={addFriendUrl(line.oaId)}>{tLine("openAccount")}</LineLink>
      </div>
    </main>
  );
}

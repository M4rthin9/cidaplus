import { getLocale, getTranslations } from "next-intl/server";
import { getCachedSetting } from "@/lib/settings/cached";
import { goLinePath } from "@/lib/line";
import { LineLink } from "./line-link";

/**
 * The product page's LINE call to action. SPEC.md §8 item 2: sticky in the
 * product info column on desktop, a fixed bottom bar on mobile.
 *
 * Both point at `/go/line?p=<slug>`, never at LINE directly, so the click is
 * recorded and the pre-filled message is resolved on the server. The label
 * comes from `settings.line.buttonLabel` for the current locale.
 */
export async function ProductLineCta({ slug }: { slug: string }) {
  const locale = await getLocale();
  const line = await getCachedSetting("line", locale);
  const t = await getTranslations("line");
  const href = goLinePath(slug);

  return (
    <>
      {/* In-column on desktop; the column itself is what is sticky. */}
      <div className="mt-8 hidden md:block">
        <LineLink href={href} className="w-full sm:w-auto">
          {line.buttonLabel}
        </LineLink>
        <p className="mt-3 text-[13px] text-(--color-text-muted)">{t("ctaHint")}</p>
      </div>

      {/*
       * Fixed bottom bar on mobile. `pb-[env(safe-area-inset-bottom)]` keeps the
       * button clear of the iOS home indicator, which otherwise sits on top of
       * the tap target on the site's single most important control.
       */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-(--color-border) bg-(--color-bg) p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <LineLink href={href} className="w-full">
          {line.buttonLabel}
        </LineLink>
      </div>
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Custom 500 in Thai (SPEC.md §10). No LINE button here: this renders when
 * something already failed, and reading `settings.line` would be one more thing
 * that can throw inside the error boundary.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error("[public] render failed:", error.digest ?? error.message);
  }, [error]);

  return (
    <main id="content" className="mx-auto max-w-(--container-site) px-4 py-24 md:px-6">
      <h1 className="text-3xl font-semibold md:text-[40px]">{t("serverTitle")}</h1>
      <div className="mt-4 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
      <p className="mt-6 max-w-prose text-(--color-text)">{t("serverBody")}</p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="rounded-(--radius-control) border border-(--color-border) px-5 py-2.5 text-sm text-(--color-brand) hover:border-(--color-brand)"
        >
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}

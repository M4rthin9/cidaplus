import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Prev / next with a live page count. Real links, not buttons, so the pages are
 * crawlable and open in a new tab like anything else.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  const t = useTranslations("pagination");
  if (totalPages <= 1) return null;

  const linkClass =
    "rounded-(--radius-control) border border-(--color-border) px-4 py-2.5 text-sm text-(--color-brand) hover:border-(--color-brand) hover:text-(--color-brand-hover)";
  const disabledClass =
    "rounded-(--radius-control) border border-(--color-border) px-4 py-2.5 text-sm text-(--color-text-muted)";

  return (
    <nav aria-label={t("label")} className="mt-10 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={linkClass}>
          {t("previous")}
        </Link>
      ) : (
        <span className={cn(disabledClass, "opacity-60")} aria-hidden="true">
          {t("previous")}
        </span>
      )}

      <p aria-live="polite" className="text-sm text-(--color-text-muted)">
        {t("status", { page, total: totalPages })}
      </p>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={linkClass}>
          {t("next")}
        </Link>
      ) : (
        <span className={cn(disabledClass, "opacity-60")} aria-hidden="true">
          {t("next")}
        </span>
      )}
    </nav>
  );
}

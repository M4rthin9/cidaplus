import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProductSort } from "@/lib/public/queries";

/**
 * Sort control as links rather than a `<select>` + JS. Each ordering gets a real
 * URL, works with JavaScript disabled, and is keyboard-operable without any
 * custom handling — which is what §10's keyboard requirement asks for.
 */
const OPTIONS: {
  value: ProductSort;
  key: "sortDefault" | "sortNewest" | "sortPriceAsc" | "sortPriceDesc";
}[] = [
  { value: "default", key: "sortDefault" },
  { value: "newest", key: "sortNewest" },
  { value: "price-asc", key: "sortPriceAsc" },
  { value: "price-desc", key: "sortPriceDesc" },
];

/**
 * `hrefFor` rather than a base path: the catalog carries a category filter, a
 * search term and a page number alongside the sort, and a control that rebuilt
 * the URL from a prefix alone would silently drop them.
 */
export function SortLinks({
  sort,
  hrefFor,
}: {
  sort: ProductSort;
  hrefFor: (sort: ProductSort) => string;
}) {
  const t = useTranslations("category");

  return (
    <nav aria-label={t("sort")} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-(--color-text-muted)">{t("sort")}</span>
      {OPTIONS.map((option) => {
        const active = option.value === sort;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-(--radius-control) bg-(--color-brand-tint) px-3 py-1.5 text-sm font-medium text-(--color-brand)"
                : "rounded-(--radius-control) px-3 py-1.5 text-sm text-(--color-text) hover:text-(--color-brand)"
            }
          >
            {t(option.key)}
          </Link>
        );
      })}
    </nav>
  );
}

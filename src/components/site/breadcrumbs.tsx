import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type Crumb = { href?: string; label: string };

/**
 * Visible breadcrumbs. The `BreadcrumbList` JSON-LD that §10 asks for is
 * phase 10's job — this is the human-readable half.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("breadcrumb")} className="mb-6 text-sm text-(--color-text-muted)">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="text-(--color-brand) hover:text-(--color-brand-hover)"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

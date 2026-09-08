"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { EnabledLocale } from "@/lib/public/locales";

/**
 * Language switcher. SPEC.md §5: "the switcher maps to the equivalent slug in
 * the target locale — never back to the homepage."
 *
 * That is what `pathsByLocale` is for. Slugs are per-locale (§14 decision 17),
 * so a product page passes its own map and the switcher lands on the same
 * product; every other page reuses the current path, which is locale-independent.
 *
 * `usePathname` here is next-intl's, which returns the path with the locale
 * prefix already removed — the prefix rule stays in `routing.ts`.
 *
 * Renders nothing while one locale is enabled, which is v1 (§14 decision 9). It
 * appears the moment a second `locales` row is switched on: no deploy.
 */
export function LanguageSwitcher({
  locales,
  pathsByLocale,
}: {
  locales: EnabledLocale[];
  pathsByLocale?: Record<string, string>;
}) {
  const t = useTranslations("locale");
  const active = useLocale();
  const pathname = usePathname();

  if (locales.length < 2) return null;

  return (
    <nav aria-label={t("switch")} className="flex items-center gap-1">
      {locales.map((locale) => {
        const isActive = locale.code === active;
        return (
          <Link
            key={locale.code}
            href={pathsByLocale?.[locale.code] ?? pathname}
            locale={locale.code}
            hrefLang={locale.code}
            aria-current={isActive ? "true" : undefined}
            className={
              isActive
                ? "rounded-(--radius-control) bg-(--color-brand-tint) px-2.5 py-1.5 text-sm font-medium text-(--color-brand)"
                : "rounded-(--radius-control) px-2.5 py-1.5 text-sm text-(--color-text) hover:text-(--color-brand)"
            }
          >
            {locale.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { LineLink } from "./line-link";
import { MenuLink } from "./menu-link";
import type { EnabledLocale } from "@/lib/public/locales";
import type { MenuItems } from "@/lib/menus/schema";

/**
 * Primary navigation, driven by the header menu (SPEC.md §5, `/admin/menus`).
 *
 * The items come from `menu_i18n` when the operator has saved one and from the
 * site's shipped default otherwise — `SiteHeader` decides which, so this
 * component has one code path either way.
 *
 * §10: "nav dropdowns operable without a mouse; `aria-current` on active nav
 * items". An item with children is a real button with `aria-expanded` and
 * `aria-controls` rather than a hover-only panel — a hover menu is unreachable
 * by keyboard and unusable on touch. Escape closes it and returns focus to the
 * trigger; a click outside closes it too.
 */
export function SiteNav({
  items,
  locales,
  lineHref,
  lineLabel,
  pathsByLocale,
}: {
  items: MenuItems;
  locales: EnabledLocale[];
  lineHref: string;
  lineLabel: string;
  pathsByLocale?: Record<string, string>;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const [openId, setOpenId] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const drawerId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  // Route change closes everything — otherwise the drawer stays over the new page.
  useEffect(() => {
    setOpenId(null);
    setOpenDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!openId) return;

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const trigger = document.getElementById(`menu-trigger-${openId}`);
      setOpenId(null);
      trigger?.focus();
    }
    function onPointer(event: MouseEvent) {
      if (wrap.current?.contains(event.target as Node)) return;
      setOpenId(null);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [openId]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : href.startsWith("/") && pathname.startsWith(href);

  const linkClass = (href: string) =>
    isActive(href)
      ? "text-sm font-medium text-(--color-brand)"
      : "text-sm text-(--color-text) hover:text-(--color-brand)";

  return (
    <>
      <nav aria-label={t("primary")} className="hidden items-center gap-6 lg:flex" ref={wrap}>
        {items.map((item) =>
          item.children.length > 0 ? (
            <div key={item.id} className="relative">
              <button
                id={`menu-trigger-${item.id}`}
                type="button"
                aria-expanded={openId === item.id}
                aria-controls={`menu-panel-${item.id}`}
                onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
                className={`flex items-center gap-1 ${linkClass(item.href)}`}
              >
                {item.label}
                <span aria-hidden="true" className="text-[10px]">
                  ▾
                </span>
              </button>

              {openId === item.id && (
                <div
                  id={`menu-panel-${item.id}`}
                  className="absolute start-0 top-full z-20 mt-2 min-w-56 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) py-2"
                >
                  <MenuLink
                    item={item}
                    className="block px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface) hover:text-(--color-brand)"
                  />
                  {item.children.map((child) => (
                    <MenuLink
                      key={child.id}
                      item={child}
                      className="block px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface) hover:text-(--color-brand)"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <MenuLink
              key={item.id}
              item={item}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={linkClass(item.href)}
            />
          ),
        )}

        <Link href="/search" className={linkClass("/search")}>
          {t("search")}
        </Link>

        <LanguageSwitcher locales={locales} pathsByLocale={pathsByLocale} />

        <LineLink href={lineHref}>{lineLabel}</LineLink>
      </nav>

      <button
        type="button"
        aria-expanded={openDrawer}
        aria-controls={drawerId}
        onClick={() => setOpenDrawer((v) => !v)}
        className="ms-auto rounded-(--radius-control) border border-(--color-border) px-3 py-2.5 text-sm text-(--color-text) lg:hidden"
      >
        {openDrawer ? t("closeMenu") : t("openMenu")}
      </button>

      {openDrawer && (
        <nav
          id={drawerId}
          aria-label={t("primary")}
          className="w-full border-t border-(--color-border) py-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id}>
                <MenuLink item={item} className="block py-2.5 text-sm text-(--color-text)" />
                {item.children.length > 0 && (
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <MenuLink
                          item={child}
                          className="block py-2.5 ps-4 text-sm text-(--color-text-muted)"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <Link href="/search" className="block py-2.5 text-sm text-(--color-text)">
                {t("search")}
              </Link>
            </li>
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LineLink href={lineHref}>{lineLabel}</LineLink>
            <LanguageSwitcher locales={locales} pathsByLocale={pathsByLocale} />
          </div>
        </nav>
      )}
    </>
  );
}

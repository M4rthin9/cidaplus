"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { LineLink } from "./line-link";
import type { EnabledLocale } from "@/lib/public/locales";

export type NavCategory = { slug: string; name: string };

/**
 * Primary navigation. §10: "nav dropdowns operable without a mouse;
 * `aria-current` on active nav items".
 *
 * The category dropdown is a real button with `aria-expanded` and
 * `aria-controls` rather than a hover-only panel — a hover menu is unreachable
 * by keyboard and unusable on touch. Escape closes it and returns focus to the
 * trigger; a click outside closes it too.
 *
 * The links are fixed for now. §5's menu builder (`/admin/menus`) is phase 9;
 * when it lands, the items come from `menu_i18n` and this component takes them
 * as a prop instead of naming them.
 */
export function SiteNav({
  categories,
  locales,
  lineHref,
  lineLabel,
  pathsByLocale,
}: {
  categories: NavCategory[];
  locales: EnabledLocale[];
  lineHref: string;
  lineLabel: string;
  pathsByLocale?: Record<string, string>;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const menuId = useId();
  const drawerId = useId();
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuWrap = useRef<HTMLDivElement>(null);

  // Route change closes everything — otherwise the drawer stays over the new page.
  useEffect(() => {
    setOpenMenu(false);
    setOpenDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenMenu(false);
      menuTrigger.current?.focus();
    }
    function onPointer(event: MouseEvent) {
      if (menuWrap.current?.contains(event.target as Node)) return;
      setOpenMenu(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [openMenu]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    isActive(href)
      ? "text-sm font-medium text-(--color-brand)"
      : "text-sm text-(--color-text) hover:text-(--color-brand)";

  const links = [
    { href: "/", label: t("home") },
    { href: "/news", label: t("news") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <>
      <nav aria-label={t("primary")} className="hidden items-center gap-6 lg:flex">
        <Link href="/" aria-current={isActive("/") ? "page" : undefined} className={linkClass("/")}>
          {t("home")}
        </Link>

        <div ref={menuWrap} className="relative">
          <button
            ref={menuTrigger}
            type="button"
            aria-expanded={openMenu}
            aria-controls={menuId}
            onClick={() => setOpenMenu((v) => !v)}
            className={`flex items-center gap-1 ${linkClass("/categor")}`}
          >
            {t("categories")}
            <span aria-hidden="true" className="text-[10px]">
              ▾
            </span>
          </button>

          {openMenu && (
            <div
              id={menuId}
              className="absolute start-0 top-full z-20 mt-2 min-w-56 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) py-2"
            >
              <Link
                href="/categories"
                className="block px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface) hover:text-(--color-brand)"
              >
                {t("categories")}
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="block px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface) hover:text-(--color-brand)"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {links.slice(1).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={linkClass(link.href)}
          >
            {link.label}
          </Link>
        ))}

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
            <li>
              <Link href="/" className="block py-2.5 text-sm text-(--color-text)">
                {t("home")}
              </Link>
            </li>
            <li>
              <Link href="/categories" className="block py-2.5 text-sm text-(--color-text)">
                {t("categories")}
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="block py-2.5 ps-4 text-sm text-(--color-text-muted)"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            {links.slice(1).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-2.5 text-sm text-(--color-text)">
                  {link.label}
                </Link>
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

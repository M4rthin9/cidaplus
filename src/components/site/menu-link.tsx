import { Link } from "@/i18n/navigation";
import type { MenuLeaf } from "@/lib/menus/schema";

/**
 * One menu entry. An internal path goes through next-intl's `Link` so it picks
 * up the active locale; an absolute URL must not, because prefixing an external
 * host with `/en` would produce a broken link. The schema only admits those two
 * shapes (`linkHref`), so there is no third case.
 */
export function MenuLink({
  item,
  className,
  ...rest
}: {
  item: Pick<MenuLeaf, "label" | "href" | "target">;
  className?: string;
} & Omit<React.ComponentProps<"a">, "href" | "target" | "rel" | "className">) {
  if (item.href.startsWith("/")) {
    return (
      <Link
        href={item.href}
        className={className}
        target={item.target === "blank" ? "_blank" : undefined}
        rel={item.target === "blank" ? "noopener noreferrer" : undefined}
        {...rest}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <a
      href={item.href}
      className={className}
      target={item.target === "blank" ? "_blank" : undefined}
      rel="noopener noreferrer"
      {...rest}
    >
      {item.label}
    </a>
  );
}

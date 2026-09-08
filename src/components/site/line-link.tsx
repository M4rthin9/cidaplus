import { cn } from "@/lib/utils";

/**
 * A LINE entry point. §8 item 7: `rel="noopener"` and `target="_blank"` on every
 * external LINE link.
 *
 * The href is always built by `src/lib/line.ts` from `settings.line.oaId`, never
 * written at a call site. Green is reserved for this handoff and nothing else
 * (docs/DESIGN.md) — white on `--color-accent` is 5.4:1, which clears AA.
 */
export function LineLink({
  href,
  children,
  variant = "solid",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "quiet";
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        // Extra vertical padding: Thai diacritics stack and touch the border at
        // Latin button padding (docs/DESIGN.md).
        "inline-flex items-center justify-center rounded-(--radius-control) px-4 py-2.5 text-sm font-medium",
        variant === "solid"
          ? "bg-(--color-accent) text-white hover:opacity-90"
          : "bg-(--color-accent-tint) text-(--color-accent-ink) hover:opacity-90",
        className,
      )}
    >
      {children}
    </a>
  );
}

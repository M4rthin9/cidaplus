import { cn } from "@/lib/utils";
import { SiteIcon } from "./icons";

/**
 * A LINE entry point. §8 item 7: `rel="noopener"` and `target="_blank"`.
 *
 * `noopener` and not `noreferrer`. Every one of these now points at `/go/line`
 * on our own origin, so `noreferrer` would buy no isolation the same-origin
 * policy does not already give — and it strips the `Referer` header that §8
 * item 5 asks `line_clicks.referrer` to record, which is how the operator sees
 * *which page* an enquiry came from. Measured: with `noreferrer` every row
 * stored a null referrer.
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
      rel="noopener"
      className={cn(
        // Extra vertical padding: Thai diacritics stack and touch the border at
        // Latin button padding (docs/DESIGN.md).
        "line-button inline-flex items-center justify-center rounded-(--radius-control) px-4 py-2.5 text-sm font-medium",
        variant === "solid"
          ? "bg-(--color-accent) text-white hover:opacity-90"
          : "bg-(--color-accent-tint) text-(--color-accent-ink) hover:opacity-90",
        className,
      )}
    >
      <SiteIcon name="chat" />
      {children}
    </a>
  );
}

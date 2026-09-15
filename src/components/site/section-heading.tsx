import { cn } from "@/lib/utils";

/**
 * A section title with the crimson rule under it (docs/DESIGN.md: "the rule
 * under a section heading" is one of crimson's four jobs).
 *
 * `as` exists because several listing pages use this component for the page
 * title itself, and a page whose only heading is an `h2` has no `h1` — which is
 * what a screen reader reads first to say what the page is. The level is a
 * separate decision from the look, so it is a prop rather than a second
 * component that would drift from this one.
 */
export function SectionHeading({
  children,
  action,
  className,
  id,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn("section-heading flex flex-wrap items-end justify-between gap-4", className)}
    >
      <div>
        <Tag id={id} className="text-2xl font-semibold md:text-[28px]">
          {children}
        </Tag>
      </div>
      {action}
    </div>
  );
}

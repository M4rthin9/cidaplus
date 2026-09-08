import { cn } from "@/lib/utils";

/**
 * A section title with the crimson rule under it (docs/DESIGN.md: "the rule
 * under a section heading" is one of crimson's four jobs).
 */
export function SectionHeading({
  children,
  action,
  className,
  id,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h2 id={id} className="text-2xl font-semibold md:text-[28px]">
          {children}
        </h2>
        <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-brand)" aria-hidden="true" />
      </div>
      {action}
    </div>
  );
}

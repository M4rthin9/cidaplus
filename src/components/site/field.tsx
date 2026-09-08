"use client";

import { useId } from "react";

/**
 * One labelled form control for the storefront.
 *
 * The error renders next to the field and is wired through `aria-describedby`
 * and `aria-invalid` — §9 requires validation errors inline rather than as a
 * bare toast, and a screen reader has to reach the same message a sighted
 * visitor sees.
 *
 * The admin has its own `components/ui/field.tsx`; that one is styled for a
 * dense table-driven UI, and merging them would make one of the two worse.
 */
type ControlProps = {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  className: string;
};

export function Field({
  name,
  label,
  hint,
  error,
  required,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-(--color-heading)">
        {label}
        {required && (
          <span aria-hidden="true" className="ms-1 text-(--color-brand)">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="mt-1 text-[13px] text-(--color-text-muted)">
          {hint}
        </p>
      )}

      <div className="mt-2">
        {children({
          id,
          name,
          required,
          defaultValue,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy || undefined,
          className: `w-full rounded-(--radius-control) border bg-(--color-surface) px-3 py-2.5 text-(--color-heading) ${
            error ? "border-(--color-brand)" : "border-(--color-border)"
          }`,
        })}
      </div>

      {error && (
        <p id={errorId} className="mt-2 text-sm text-(--color-brand)">
          {error}
        </p>
      )}
    </div>
  );
}

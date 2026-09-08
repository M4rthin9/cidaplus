import { cn } from "@/lib/utils";

/**
 * Form primitives. Validation errors render inline next to the field, in Thai,
 * never as a bare toast (SPEC.md §9).
 *
 * Buttons and inputs carry extra vertical padding: Thai diacritics stack above
 * and below the baseline and touch the border at Latin padding (docs/DESIGN.md).
 */

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-(--color-heading)">
      {children}
      {required ? (
        <span className="ms-1 text-(--color-brand)" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-(--color-brand)" role="alert">
      {message}
    </p>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm text-(--color-text-muted)">{children}</p>;
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: string };

export function Input({ className, error, id, ...props }: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        "mt-1.5 block w-full rounded-(--radius-control) border bg-(--color-bg)",
        "px-3 py-2.5 text-base text-(--color-heading)",
        "placeholder:text-(--color-text-muted)",
        "focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:ring-offset-1",
        error ? "border-(--color-brand)" : "border-(--color-border)",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  error,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        "mt-1.5 block w-full rounded-(--radius-control) border bg-(--color-bg)",
        "px-3 py-2.5 text-base text-(--color-heading)",
        "focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:ring-offset-1",
        error ? "border-(--color-brand)" : "border-(--color-border)",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-(--radius-control)",
        // 10px minimum vertical padding on a 14px Thai label (docs/DESIGN.md)
        "px-4 py-2.5 text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-(--color-brand) disabled:opacity-50",
        variant === "primary" && "bg-(--color-brand) text-white hover:bg-(--color-brand-hover)",
        variant === "secondary" &&
          "border border-(--color-border) bg-(--color-bg) text-(--color-heading) hover:bg-(--color-surface)",
        variant === "danger" &&
          "border border-(--color-brand) text-(--color-brand) hover:bg-(--color-brand-tint)",
        className,
      )}
      {...props}
    />
  );
}

export function FormBanner({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-(--radius-control) border px-4 py-3 text-sm",
        kind === "error"
          ? "border-(--color-brand) bg-(--color-brand-tint) text-(--color-brand)"
          : "border-(--color-accent) bg-(--color-accent-tint) text-(--color-accent-ink)",
      )}
    >
      {children}
    </div>
  );
}

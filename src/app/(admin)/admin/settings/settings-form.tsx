"use client";

import { useActionState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label } from "@/components/ui/field";
import type { SettingsFormState } from "./actions";

const initial: SettingsFormState = {};

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "number" | "checkbox" | "textarea" | "color";
  hint?: string;
  required?: boolean;
  placeholder?: string;
};

export function SettingsForm({
  action,
  fields,
  values,
  children,
}: {
  action: (prev: SettingsFormState, fd: FormData) => Promise<SettingsFormState>;
  fields: FieldSpec[];
  values: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="max-w-2xl space-y-5" noValidate>
      {state.message ? (
        <FormBanner kind={state.errors ? "error" : "success"}>{state.message}</FormBanner>
      ) : null}

      {fields.map((f) => {
        const value = values[f.name];
        const error = state.errors?.[f.name];

        if (f.type === "checkbox") {
          return (
            <div key={f.name} className="flex items-start gap-2.5">
              <input
                id={f.name}
                name={f.name}
                type="checkbox"
                defaultChecked={Boolean(value)}
                className="mt-1 size-4 accent-(--color-brand)"
              />
              <label htmlFor={f.name} className="text-sm text-(--color-heading)">
                {f.label}
                {f.hint ? <span className="block text-(--color-text-muted)">{f.hint}</span> : null}
              </label>
            </div>
          );
        }

        if (f.type === "textarea") {
          return (
            <div key={f.name}>
              <Label htmlFor={f.name} required={f.required}>
                {f.label}
              </Label>
              <textarea
                id={f.name}
                name={f.name}
                rows={3}
                defaultValue={typeof value === "string" ? value : ""}
                className="mt-1.5 block w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-base leading-[1.8] text-(--color-heading) focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
              <FieldError id={`${f.name}-error`} message={error} />
              {f.hint ? <Hint>{f.hint}</Hint> : null}
            </div>
          );
        }

        return (
          <div key={f.name}>
            <Label htmlFor={f.name} required={f.required}>
              {f.label}
            </Label>
            <Input
              id={f.name}
              name={f.name}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              defaultValue={value === undefined || value === null ? "" : String(value)}
              error={error}
            />
            <FieldError id={`${f.name}-error`} message={error} />
            {f.hint ? <Hint>{f.hint}</Hint> : null}
          </div>
        );
      })}

      {children}

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
      </Button>
    </form>
  );
}

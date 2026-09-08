"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { submitContactAction } from "./actions";
import type { ContactFormState } from "@/lib/validation/contact";
import { Field } from "@/components/site/field";

const INITIAL: ContactFormState = { status: "idle" };

function SubmitButton() {
  const t = useTranslations("contact");
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      // Extra vertical padding so Thai diacritics clear the border (docs/DESIGN.md).
      className="rounded-(--radius-control) bg-(--color-brand) px-6 py-3 text-sm font-medium text-white hover:bg-(--color-brand-hover) disabled:opacity-60"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

export function ContactForm({ privacyNote }: { privacyNote: string }) {
  const t = useTranslations("contact");
  const [state, formAction] = useActionState(submitContactAction, INITIAL);

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="rounded-(--radius-card) bg-(--color-accent-tint) px-5 py-4 text-(--color-accent-ink)"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.message && (
        <p
          role="alert"
          className="rounded-(--radius-card) bg-(--color-brand-tint) px-5 py-4 text-(--color-brand)"
        >
          {state.message}
        </p>
      )}

      <Field
        name="name"
        label={t("name")}
        error={state.errors?.name}
        defaultValue={state.values?.name}
        required
      >
        {(props) => <input type="text" autoComplete="name" {...props} />}
      </Field>

      <Field
        name="email"
        label={t("emailField")}
        error={state.errors?.email}
        defaultValue={state.values?.email}
        required
      >
        {(props) => <input type="email" autoComplete="email" {...props} />}
      </Field>

      <Field
        name="phone"
        label={t("phoneField")}
        hint={t("phoneOptional")}
        error={state.errors?.phone}
        defaultValue={state.values?.phone}
      >
        {(props) => <input type="tel" autoComplete="tel" {...props} />}
      </Field>

      <Field
        name="subject"
        label={t("subject")}
        error={state.errors?.subject}
        defaultValue={state.values?.subject}
      >
        {(props) => <input type="text" {...props} />}
      </Field>

      <Field
        name="body"
        label={t("message")}
        error={state.errors?.body}
        defaultValue={state.values?.body}
        required
      >
        {(props) => <textarea rows={6} {...props} />}
      </Field>

      {/* Honeypot — never shown, never announced. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* PDPA note: what is collected and why (SPEC.md §10). */}
      <p className="text-sm text-(--color-text-muted)">{privacyNote}</p>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

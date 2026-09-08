"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, FieldError, FormBanner, Hint, Input, Label } from "@/components/ui/field";
import type { PageFormState } from "@/lib/validation/page";
import type { PickerItem } from "@/components/media/media-picker";
import type { PreviewBase } from "@/lib/sections/preview";
import type { SectionsValue } from "@/lib/sections/schema";
import { SectionBuilder } from "./section-builder";

const INITIAL: PageFormState = {};

export type PageDefaults = {
  key: string;
  title: string;
  slug: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
};

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : label}
    </Button>
  );
}

export function PageForm({
  action,
  defaults,
  sections,
  unknownTypes,
  media,
  categories,
  previewBase,
  messages,
  locale,
  submitLabel,
  isHome,
  publicHref,
}: {
  action: (state: PageFormState, formData: FormData) => Promise<PageFormState>;
  defaults: PageDefaults;
  sections: SectionsValue;
  unknownTypes: { id: string; type: string }[];
  media: PickerItem[];
  categories: { id: string; name: string }[];
  previewBase: PreviewBase;
  messages: Record<string, unknown>;
  locale: string;
  submitLabel: string;
  isHome: boolean;
  publicHref: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.message && <FormBanner kind="success">{state.message}</FormBanner>}
      {state.error && <FormBanner kind="error">{state.error}</FormBanner>}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="title" required>
            ชื่อหน้า
          </Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaults.title}
            error={state.errors?.title}
          />
          <FieldError id="title-error" message={state.errors?.title} />
        </div>

        <div>
          <Label htmlFor="slug" required>
            slug
          </Label>
          <Input id="slug" name="slug" defaultValue={defaults.slug} error={state.errors?.slug} />
          <FieldError id="slug-error" message={state.errors?.slug} />
          <Hint>
            {isHome
              ? "หน้าแรกใช้ที่อยู่ / เสมอ ไม่ว่าจะตั้ง slug เป็นอะไร"
              : `ที่อยู่: ${publicHref}`}
          </Hint>
        </div>

        <div>
          <Label htmlFor="key" required>
            รหัสหน้า
          </Label>
          <Input
            id="key"
            name="key"
            defaultValue={defaults.key}
            readOnly={isHome}
            error={state.errors?.key}
          />
          <FieldError id="key-error" message={state.errors?.key} />
          <Hint>
            {isHome
              ? "รหัส home สงวนไว้สำหรับหน้าแรก แก้ไขไม่ได้"
              : "ตัวระบุภายในระบบ ใช้ a-z 0-9 และ - เท่านั้น"}
          </Hint>
        </div>

        <div className="flex items-center gap-2 pt-7">
          <input
            id="isPublished"
            name="isPublished"
            type="checkbox"
            defaultChecked={defaults.isPublished}
          />
          <label htmlFor="isPublished" className="text-sm text-(--color-heading)">
            เผยแพร่หน้านี้
          </label>
        </div>

        <div>
          <Label htmlFor="seoTitle">ชื่อสำหรับ SEO</Label>
          <Input id="seoTitle" name="seoTitle" defaultValue={defaults.seoTitle} />
        </div>

        <div>
          <Label htmlFor="seoDescription">คำอธิบายสำหรับ SEO</Label>
          <Input id="seoDescription" name="seoDescription" defaultValue={defaults.seoDescription} />
        </div>
      </div>

      <SectionBuilder
        initial={sections}
        unknownTypes={unknownTypes}
        media={media}
        categories={categories}
        previewBase={previewBase}
        messages={messages}
        locale={locale}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton label={submitLabel} />
        <Link href="/admin/pages" className="text-sm text-(--color-brand) hover:underline">
          กลับไปรายการหน้า
        </Link>
      </div>
    </form>
  );
}

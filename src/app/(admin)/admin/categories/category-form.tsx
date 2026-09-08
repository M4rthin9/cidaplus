"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label, Select } from "@/components/ui/field";
import { slugify } from "@/lib/slug";
import type { CategoryFormState } from "./actions";

const initial: CategoryFormState = {};

export type ParentOption = { id: string; name: string };

export function CategoryForm({
  action,
  mode,
  parents,
  defaults,
}: {
  action: (prev: CategoryFormState, fd: FormData) => Promise<CategoryFormState>;
  mode: "create" | "edit";
  parents: ParentOption[];
  defaults?: {
    name: string;
    slug: string;
    description: string;
    parentId: string;
    isPublished: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [name, setName] = useState(defaults?.name ?? "");
  const [slug, setSlug] = useState(defaults?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(defaults?.slug));

  // Auto-fill the slug from the Thai title until the operator takes it over.
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  return (
    <form action={formAction} className="max-w-2xl space-y-5" noValidate>
      {state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}

      <div>
        <Label htmlFor="name" required>
          ชื่อหมวดหมู่
        </Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={state.errors?.name}
        />
        <FieldError id="name-error" message={state.errors?.name} />
      </div>

      <div>
        <Label htmlFor="slug">ลิงก์ (slug)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value);
          }}
          error={state.errors?.slug}
        />
        <FieldError id="slug-error" message={state.errors?.slug} />
        <Hint>
          {slug ? `/category/${slug}` : "สร้างอัตโนมัติจากชื่อ"}
          {mode === "edit"
            ? " · การเปลี่ยนลิงก์ที่เผยแพร่แล้วจะสร้างการเปลี่ยนเส้นทาง 301 ให้อัตโนมัติ"
            : ""}
        </Hint>
      </div>

      <div>
        <Label htmlFor="description">คำอธิบาย</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults?.description}
          className="mt-1.5 block w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-base leading-[1.8] text-(--color-heading) focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        />
      </div>

      <div>
        <Label htmlFor="parentId">หมวดหมู่แม่</Label>
        <Select
          id="parentId"
          name="parentId"
          defaultValue={defaults?.parentId ?? ""}
          error={state.errors?.parentId}
        >
          <option value="">— เป็นหมวดหมู่หลัก —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <FieldError id="parentId-error" message={state.errors?.parentId} />
        <Hint>รองรับการจัดกลุ่มหนึ่งระดับ</Hint>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id="isPublished"
          name="isPublished"
          type="checkbox"
          defaultChecked={defaults?.isPublished}
          className="mt-1 size-4 accent-(--color-brand)"
        />
        <label htmlFor="isPublished" className="text-sm text-(--color-heading)">
          เผยแพร่หมวดหมู่นี้
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก…" : mode === "create" ? "เพิ่มหมวดหมู่" : "บันทึกการเปลี่ยนแปลง"}
      </Button>
    </form>
  );
}

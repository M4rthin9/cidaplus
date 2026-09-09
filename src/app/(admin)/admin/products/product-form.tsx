"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label, Select } from "@/components/ui/field";
import { MediaPicker, type PickerItem } from "@/components/media/media-picker";
import { slugify } from "@/lib/slug";
import type { ProductFormState } from "./actions";

const initial: ProductFormState = {};

export type LocaleTab = { code: string; label: string; enabled: boolean; complete: boolean };

export type ProductDefaults = {
  name: string;
  slug: string;
  shortDesc: string;
  categoryId: string;
  price: string;
  priceDisplay: "exact" | "from" | "contact" | "hidden";
  sku: string;
  lineMessageOverride: string;
  isFeatured: boolean;
  publishState: "draft" | "scheduled" | "published";
  publishedAt: string;
  mediaIds: string[];
};

const AUTOSAVE_MS = 5000;

export function ProductForm({
  action,
  mode,
  productId,
  categories,
  media,
  locales,
  defaults,
}: {
  action: (prev: ProductFormState, fd: FormData) => Promise<ProductFormState>;
  mode: "create" | "edit";
  productId?: string;
  categories: { id: string; name: string }[];
  media: PickerItem[];
  locales: LocaleTab[];
  defaults: ProductDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState(defaults.name);
  const [slug, setSlug] = useState(defaults.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaults.slug));
  const [priceDisplay, setPriceDisplay] = useState(defaults.priceDisplay);
  const [publishState, setPublishState] = useState(defaults.publishState);
  const [mediaIds, setMediaIds] = useState<string[]>(defaults.mediaIds);
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const draftKey = `product-draft:${productId ?? "new"}`;

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  // §9: autosave every 5s so a closed tab never loses work.
  const snapshot = useCallback(() => {
    const fd = new FormData(formRef.current ?? undefined);
    const obj: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string") obj[k] = v;
    return obj;
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const t = setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), values: snapshot() }));
        setSavedAt(new Date().toLocaleTimeString("th-TH"));
      } catch {
        // Private mode or a full quota: autosave is a convenience, not a guarantee.
      }
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [dirty, draftKey, snapshot]);

  // §9: warn on navigate-away with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Offer a recovered draft rather than silently overwriting the saved record.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setRestored(true);
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const { values } = JSON.parse(raw) as { values: Record<string, string> };
      const form = formRef.current;
      if (!form) return;
      for (const [k, v] of Object.entries(values)) {
        const el = form.elements.namedItem(k);
        if (el instanceof HTMLInputElement && el.type !== "checkbox") el.value = v;
        else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.value = v;
      }
      if (values.name) setName(values.name);
      if (values.slug) {
        setSlug(values.slug);
        setSlugEdited(true);
      }
      if (values.mediaIds) setMediaIds(values.mediaIds.split(",").filter(Boolean));
      setRestored(false);
    } catch {
      /* ignore */
    }
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setRestored(false);
  }

  // Clear the draft once the server confirms the save.
  useEffect(() => {
    if (state.message && !state.errors) {
      discardDraft();
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.message, state.errors]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setDirty(true)}
      className="space-y-6"
      noValidate
    >
      {state.message ? (
        <FormBanner kind={state.errors ? "error" : "success"}>{state.message}</FormBanner>
      ) : null}

      {restored ? (
        <div className="flex flex-wrap items-center gap-3 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm">
          <span className="text-(--color-heading)">
            พบฉบับร่างที่บันทึกไว้อัตโนมัติในเครื่องนี้
          </span>
          <Button type="button" variant="secondary" onClick={restoreDraft}>
            กู้คืนฉบับร่าง
          </Button>
          <Button type="button" variant="secondary" onClick={discardDraft}>
            ละทิ้ง
          </Button>
        </div>
      ) : null}

      {/* Locale tab strip (§9). v1 enables Thai only; a disabled locale shows why. */}
      <div className="flex flex-wrap gap-1 border-b border-(--color-border)">
        {locales.map((l) => (
          <span
            key={l.code}
            aria-current={l.code === "th" ? "true" : undefined}
            title={l.enabled ? undefined : "ยังไม่เปิดใช้งานภาษานี้"}
            className={
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm " +
              (l.code === "th"
                ? "border-(--color-brand) text-(--color-heading)"
                : "border-transparent text-(--color-text-muted)")
            }
          >
            {l.label}
            {!l.complete ? (
              <span
                className="size-1.5 rounded-full bg-(--color-brand)"
                aria-label="ยังแปลไม่ครบ"
              />
            ) : null}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <div>
            <Label htmlFor="name" required>
              ชื่อสินค้า
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
            <Hint>{slug ? `/product/${slug}` : "สร้างอัตโนมัติจากชื่อ"}</Hint>
          </div>

          <div>
            <Label htmlFor="shortDesc">คำอธิบายสั้น</Label>
            <textarea
              id="shortDesc"
              name="shortDesc"
              rows={3}
              defaultValue={defaults.shortDesc}
              className="mt-1.5 block w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-base leading-[1.8] text-(--color-heading) focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-(--color-heading)">รูปสินค้า</legend>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <MediaPicker
                items={media}
                value={mediaIds}
                onChange={(ids) => {
                  setMediaIds(ids);
                  setDirty(true);
                }}
                multiple
                triggerLabel="เลือกรูปจากคลังภาพ"
              />
              {mediaIds.length === 0 ? (
                <span className="text-sm text-(--color-text-muted)">ยังไม่ได้เลือกรูป</span>
              ) : (
                <span className="text-sm text-(--color-text)">
                  เลือกแล้ว {mediaIds.length} รูป · รูปแรกเป็นรูปหลัก
                </span>
              )}
            </div>
            <input type="hidden" name="mediaIds" value={mediaIds.join(",")} />
          </fieldset>
        </div>

        <div className="space-y-5">
          <div>
            <Label htmlFor="categoryId" required>
              หมวดหมู่
            </Label>
            <Select
              id="categoryId"
              name="categoryId"
              defaultValue={defaults.categoryId}
              error={state.errors?.categoryId}
            >
              <option value="">— เลือกหมวดหมู่ —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <FieldError id="categoryId-error" message={state.errors?.categoryId} />
          </div>

          <div>
            <Label htmlFor="priceDisplay" required>
              การแสดงราคา
            </Label>
            <Select
              id="priceDisplay"
              name="priceDisplay"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value as ProductDefaults["priceDisplay"])}
            >
              <option value="exact">ราคาแน่นอน</option>
              <option value="from">เริ่มต้นที่</option>
              <option value="contact">สอบถามราคา</option>
              <option value="hidden">ไม่แสดงราคา</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="price" required={priceDisplay === "exact"}>
              ราคา (บาท)
            </Label>
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              defaultValue={defaults.price}
              disabled={priceDisplay === "contact" || priceDisplay === "hidden"}
              error={state.errors?.price}
            />
            <FieldError id="price-error" message={state.errors?.price} />
          </div>

          <div>
            <Label htmlFor="sku">รหัสสินค้า</Label>
            <Input id="sku" name="sku" defaultValue={defaults.sku} error={state.errors?.sku} />
          </div>

          <div>
            <Label htmlFor="lineMessageOverride">ข้อความ LINE เฉพาะสินค้านี้</Label>
            <Input
              id="lineMessageOverride"
              name="lineMessageOverride"
              defaultValue={defaults.lineMessageOverride}
              error={state.errors?.lineMessageOverride}
            />
            <FieldError
              id="lineMessageOverride-error"
              message={state.errors?.lineMessageOverride}
            />
            <Hint>
              เว้นว่างไว้เพื่อใช้ข้อความตั้งต้นจากหน้าตั้งค่า LINE ใช้ {"{product_name}"} และ{" "}
              {"{product_url}"} แทนชื่อและลิงก์สินค้าได้
            </Hint>
          </div>

          <div>
            <Label htmlFor="publishState" required>
              สถานะ
            </Label>
            <Select
              id="publishState"
              name="publishState"
              value={publishState}
              onChange={(e) => setPublishState(e.target.value as ProductDefaults["publishState"])}
            >
              <option value="draft">ฉบับร่าง</option>
              <option value="scheduled">ตั้งเวลาเผยแพร่</option>
              <option value="published">เผยแพร่</option>
            </Select>
          </div>

          {publishState === "scheduled" ? (
            <div>
              <Label htmlFor="publishedAt" required>
                วันและเวลาที่จะเผยแพร่
              </Label>
              <Input
                id="publishedAt"
                name="publishedAt"
                type="datetime-local"
                defaultValue={defaults.publishedAt}
                error={state.errors?.publishedAt}
              />
              <FieldError id="publishedAt-error" message={state.errors?.publishedAt} />
            </div>
          ) : (
            <input type="hidden" name="publishedAt" value={defaults.publishedAt} />
          )}

          <div className="flex items-start gap-2.5">
            <input
              id="isFeatured"
              name="isFeatured"
              type="checkbox"
              defaultChecked={defaults.isFeatured}
              className="mt-1 size-4 accent-(--color-brand)"
            />
            <label htmlFor="isFeatured" className="text-sm text-(--color-heading)">
              แสดงเป็นสินค้าแนะนำ
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-(--color-border) pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : mode === "create" ? "เพิ่มสินค้า" : "บันทึกการเปลี่ยนแปลง"}
        </Button>
        <span aria-live="polite" className="text-sm text-(--color-text-muted)">
          {dirty ? (savedAt ? `บันทึกฉบับร่างอัตโนมัติเมื่อ ${savedAt}` : "ยังไม่ได้บันทึก") : ""}
        </span>
      </div>
    </form>
  );
}

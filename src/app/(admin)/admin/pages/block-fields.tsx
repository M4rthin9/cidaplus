"use client";

import { useId } from "react";
import { MediaPicker, type PickerItem } from "@/components/media/media-picker";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Hint, Input, Label, Select } from "@/components/ui/field";
import { mediaUrl } from "@/lib/media/urls";
import type { Section } from "@/lib/sections/schema";

/**
 * The typed fields for one block (SPEC.md §6: "fill its typed fields").
 *
 * One switch rather than eleven files: every arm is a handful of inputs, and
 * keeping them together is what makes it obvious when a schema field has no
 * control. `patch` merges into the block, so each arm only names what it owns.
 */
type Patch = (next: Partial<Section>) => void;

const thumbFor = (id: string) => mediaUrl(id, "400.jpg");

/** A labelled control. `Label` requires `htmlFor`, so the id is generated here. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/**
 * A heading for a control that is not a single input — the media picker is a
 * button that opens a dialog, so a `<label>` pointing at it would be a lie.
 */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-(--color-heading)">{children}</p>;
}

function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Row label={label} hint={hint}>
      {(id) => (
        <Input
          id={id}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Row>
  );
}

function RepeatableList<T>({
  label,
  items,
  onChange,
  blank,
  render,
  addLabel,
  max = 8,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
  addLabel: string;
  max?: number;
}) {
  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      <ul className="mt-2 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="rounded-(--radius-control) border border-(--color-border) p-3">
            {render(item, (next) => onChange(items.map((v, i) => (i === index ? next : v))))}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="mt-2 text-sm text-(--color-brand) hover:underline"
            >
              ลบรายการนี้
            </button>
          </li>
        ))}
      </ul>
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, blank()])}
          className="mt-3 rounded-(--radius-control) border border-(--color-border) px-3 py-2 text-sm text-(--color-text)"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function BlockFields({
  block,
  patch,
  media,
  categories,
}: {
  block: Section;
  patch: Patch;
  media: PickerItem[];
  categories: { id: string; name: string }[];
}) {
  switch (block.type) {
    case "hero":
      return (
        <div className="flex flex-col gap-4">
          <TextField
            label="หัวเรื่อง"
            value={block.headline}
            onChange={(v) => patch({ headline: v })}
            hint="เว้นว่างไว้เพื่อใช้ชื่อเว็บไซต์จากหน้าตั้งค่าทั่วไป"
          />
          <TextField
            label="ข้อความนำ"
            value={block.body}
            onChange={(v) => patch({ body: v })}
            hint="เว้นว่างไว้เพื่อใช้คำโปรยจากหน้าตั้งค่าทั่วไป"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="ข้อความบนปุ่ม"
              value={block.ctaLabel}
              onChange={(v) => patch({ ctaLabel: v })}
            />
            <TextField
              label="ลิงก์ปุ่ม"
              value={block.ctaHref}
              onChange={(v) => patch({ ctaHref: v })}
              placeholder="/categories"
              hint="ขึ้นต้นด้วย / หรือ https://"
            />
          </div>
          <div>
            <GroupLabel>ภาพประกอบ</GroupLabel>
            <MediaPicker
              items={media}
              value={block.mediaId ? [block.mediaId] : []}
              onChange={(ids) => patch({ mediaId: ids[0] ?? "" })}
            />
            <Hint>เว้นว่างไว้เพื่อแสดงตราสัญลักษณ์ของหน่วยงาน</Hint>
          </div>
        </div>
      );

    case "value_props":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <RepeatableList
            label="รายการจุดเด่น"
            items={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ text: "" })}
            addLabel="เพิ่มจุดเด่น"
            render={(item, update) => (
              <Input value={item.text} onChange={(e) => update({ text: e.target.value })} />
            )}
          />
        </div>
      );

    case "featured_products":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="จำนวนสูงสุด">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={24}
                  value={block.limit}
                  onChange={(e) => patch({ limit: Number(e.target.value) })}
                />
              )}
            </Row>
            <Row label="เฉพาะหมวดหมู่">
              {(id) => (
                <Select
                  id={id}
                  value={block.categoryId ?? ""}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Row>
          </div>
          <Hint>แสดงเฉพาะสินค้าที่ตั้งค่าเป็น “สินค้าแนะนำ” และเผยแพร่แล้ว</Hint>
        </div>
      );

    case "category_showcase":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <fieldset>
            <legend className="text-sm font-medium text-(--color-heading)">หมวดหมู่ที่แสดง</legend>
            <Hint>ไม่เลือกเลย = แสดงทุกหมวดหมู่ตามลำดับที่ตั้งไว้</Hint>
            <ul className="mt-2 flex flex-col gap-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <input
                    id={`cat-${block.id}-${c.id}`}
                    type="checkbox"
                    checked={block.categoryIds.includes(c.id)}
                    onChange={(e) =>
                      patch({
                        categoryIds: e.target.checked
                          ? [...block.categoryIds, c.id]
                          : block.categoryIds.filter((id) => id !== c.id),
                      })
                    }
                  />
                  <label
                    htmlFor={`cat-${block.id}-${c.id}`}
                    className="text-sm text-(--color-text)"
                  >
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      );

    case "why_us_grid":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <RepeatableList
            label="รายการ"
            items={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ heading: "", body: undefined })}
            addLabel="เพิ่มรายการ"
            render={(item, update) => (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="หัวข้อ"
                  value={item.heading}
                  onChange={(e) => update({ ...item, heading: e.target.value })}
                />
                <Input
                  placeholder="คำอธิบาย"
                  value={item.body ?? ""}
                  onChange={(e) => update({ ...item, body: e.target.value })}
                />
              </div>
            )}
          />
        </div>
      );

    case "rich_text":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <div>
            <GroupLabel>เนื้อหา</GroupLabel>
            <RichTextEditor
              initialDoc={block.body}
              media={media}
              mediaUrlFor={thumbFor}
              onChange={(doc) =>
                patch({ body: doc as Section extends { body: infer B } ? B : never })
              }
            />
          </div>
        </div>
      );

    case "image_banner":
      return (
        <div className="flex flex-col gap-4">
          <div>
            <GroupLabel>ภาพ</GroupLabel>
            <MediaPicker
              items={media}
              value={block.mediaId ? [block.mediaId] : []}
              onChange={(ids) => patch({ mediaId: ids[0] ?? "" })}
            />
          </div>
          <TextField
            label="หัวเรื่อง"
            value={block.headline}
            onChange={(v) => patch({ headline: v })}
          />
          <TextField label="ข้อความ" value={block.body} onChange={(v) => patch({ body: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="ข้อความบนปุ่ม"
              value={block.ctaLabel}
              onChange={(v) => patch({ ctaLabel: v })}
            />
            <TextField
              label="ลิงก์ปุ่ม"
              value={block.ctaHref}
              onChange={(v) => patch({ ctaHref: v })}
              hint="ขึ้นต้นด้วย / หรือ https://"
            />
          </div>
        </div>
      );

    case "latest_posts":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="จำนวนสูงสุด">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={12}
                  value={block.limit}
                  onChange={(e) => patch({ limit: Number(e.target.value) })}
                />
              )}
            </Row>
            <Row label="ชนิด">
              {(id) => (
                <Select
                  id={id}
                  value={block.postType}
                  onChange={(e) => patch({ postType: e.target.value as typeof block.postType })}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="news">ข่าว</option>
                  <option value="event">กิจกรรม</option>
                </Select>
              )}
            </Row>
          </div>
        </div>
      );

    case "gallery_strip":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <div>
            <GroupLabel>ภาพในแถบ</GroupLabel>
            <MediaPicker
              items={media}
              value={block.mediaIds}
              multiple
              onChange={(ids) => patch({ mediaIds: ids })}
            />
            <Hint>เลือกได้สูงสุด 24 ภาพ เรียงตามลำดับที่เลือก</Hint>
          </div>
        </div>
      );

    case "cta_line":
      return (
        <div className="flex flex-col gap-4">
          <TextField
            label="หัวเรื่อง"
            value={block.headline}
            onChange={(v) => patch({ headline: v })}
            hint="เว้นว่างไว้เพื่อใช้ข้อความมาตรฐาน"
          />
          <TextField label="ข้อความ" value={block.body} onChange={(v) => patch({ body: v })} />
          <Hint>ปุ่มและบัญชี LINE มาจากหน้าตั้งค่า LINE เสมอ</Hint>
        </div>
      );

    case "faq_accordion":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="หัวข้อ" value={block.title} onChange={(v) => patch({ title: v })} />
          <RepeatableList
            label="คำถามและคำตอบ"
            items={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ question: "", answer: "" })}
            addLabel="เพิ่มคำถาม"
            max={20}
            render={(item, update) => (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="คำถาม"
                  value={item.question}
                  onChange={(e) => update({ ...item, question: e.target.value })}
                />
                <Input
                  placeholder="คำตอบ"
                  value={item.answer}
                  onChange={(e) => update({ ...item, answer: e.target.value })}
                />
              </div>
            )}
          />
        </div>
      );
  }
}

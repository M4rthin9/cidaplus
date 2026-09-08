"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NextIntlClientProvider } from "next-intl";
import { Select } from "@/components/ui/field";
import { Sections } from "@/components/sections/render";
import { buildPreviewData, type PreviewBase } from "@/lib/sections/preview";
import {
  SECTION_META,
  SECTION_TYPES,
  emptySection,
  type Section,
  type SectionType,
  type SectionsValue,
} from "@/lib/sections/schema";
import { BlockFields } from "./block-fields";
import type { PickerItem } from "@/components/media/media-picker";

/**
 * The homepage section builder. SPEC.md §6: add a block, choose its type, fill
 * its typed fields, drag to reorder, toggle visible, duplicate, delete — with a
 * live preview pane.
 *
 * The preview renders the **same** components the public page uses, fed by
 * `buildPreviewData` applying the same filters `loadSectionData` applies in SQL.
 * A preview assembled from a second set of components would be a preview of the
 * wrong thing, and the operator would find that out after publishing.
 *
 * The array is submitted as JSON in a hidden input; the server rebuilds it with
 * `sanitizeSections`, so nothing here is trusted.
 */
function newId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function BlockCard({
  block,
  index,
  total,
  media,
  categories,
  onPatch,
  onMove,
  onDuplicate,
  onRemove,
  onToggle,
}: {
  block: Section;
  index: number;
  total: number;
  media: PickerItem[];
  categories: { id: string; name: string }[];
  onPatch: (next: Partial<Section>) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-(--radius-card) border bg-(--color-bg) ${
        isDragging ? "border-(--color-brand)" : "border-(--color-border)"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`ลากเพื่อจัดลำดับ ${SECTION_META[block.type].label}`}
          className="cursor-grab rounded-(--radius-control) border border-(--color-border) px-2 py-1 text-sm text-(--color-text-muted)"
        >
          ⠿
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-sm font-medium text-(--color-heading)"
        >
          {SECTION_META[block.type].label}
        </button>

        {!block.isVisible && (
          <span className="rounded-(--radius-control) bg-(--color-surface) px-2 py-0.5 text-xs text-(--color-text-muted)">
            ซ่อนอยู่
          </span>
        )}

        <div className="ms-auto flex flex-wrap items-center gap-2 text-sm">
          {/* Keyboard equivalents for the drag handle, so reordering never needs a mouse. */}
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            className="rounded-(--radius-control) border border-(--color-border) px-2 py-1 disabled:opacity-40"
          >
            ขึ้น
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            className="rounded-(--radius-control) border border-(--color-border) px-2 py-1 disabled:opacity-40"
          >
            ลง
          </button>
          <button type="button" onClick={onToggle} className="text-(--color-brand) hover:underline">
            {block.isVisible ? "ซ่อน" : "แสดง"}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="text-(--color-brand) hover:underline"
          >
            ทำสำเนา
          </button>
          <button type="button" onClick={onRemove} className="text-(--color-brand) hover:underline">
            ลบ
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-(--color-border) px-3 py-4">
          <p className="mb-4 text-[13px] text-(--color-text-muted)">
            {SECTION_META[block.type].hint}
          </p>
          <BlockFields block={block} patch={onPatch} media={media} categories={categories} />
        </div>
      )}
    </li>
  );
}

export function SectionBuilder({
  initial,
  unknownTypes,
  media,
  categories,
  previewBase,
  messages,
  locale,
}: {
  initial: SectionsValue;
  unknownTypes: { id: string; type: string }[];
  media: PickerItem[];
  categories: { id: string; name: string }[];
  previewBase: PreviewBase;
  messages: Record<string, unknown>;
  locale: string;
}) {
  const [blocks, setBlocks] = useState<SectionsValue>(initial);
  const [addType, setAddType] = useState<SectionType>("hero");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const previewData = useMemo(() => buildPreviewData(blocks, previewBase), [blocks, previewBase]);

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length) return;
    setBlocks((current) => arrayMove(current, from, to));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    setBlocks((current) => arrayMove(current, from, to));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div>
        <input type="hidden" name="sections" value={JSON.stringify(blocks)} />

        {unknownTypes.length > 0 && (
          <p className="mb-4 rounded-(--radius-card) bg-(--color-brand-tint) px-4 py-3 text-sm text-(--color-brand)">
            พบบล็อกที่ระบบไม่รู้จัก {unknownTypes.length} รายการ (
            {unknownTypes.map((u) => u.type).join(", ")}) — จะไม่แสดงบนหน้าเว็บ
            และจะถูกลบออกเมื่อบันทึก
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            // dnd-kit's own announcements are English and read out ids; every
            // admin-facing string is Thai, and a screen reader is admin-facing.
            announcements: {
              onDragStart: ({ active }) =>
                `เริ่มลากบล็อก ${SECTION_META[blocks.find((b) => b.id === active.id)?.type ?? "hero"].label}`,
              onDragOver: () => undefined,
              onDragEnd: ({ active, over }) => {
                const to = blocks.findIndex((b) => b.id === over?.id);
                const name =
                  SECTION_META[blocks.find((b) => b.id === active.id)?.type ?? "hero"].label;
                return over
                  ? `วางบล็อก ${name} ไว้ที่ตำแหน่งที่ ${to + 1}`
                  : `ยกเลิกการลาก ${name}`;
              },
              onDragCancel: () => "ยกเลิกการจัดลำดับ",
            },
            screenReaderInstructions: {
              draggable:
                "กด Space เพื่อเริ่มลาก ใช้ปุ่มลูกศรขึ้นลงเพื่อย้ายตำแหน่ง กด Space อีกครั้งเพื่อวาง หรือกด Escape เพื่อยกเลิก",
            },
          }}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-3">
              {blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  media={media}
                  categories={categories}
                  onMove={move}
                  onPatch={(next) =>
                    setBlocks((current) =>
                      current.map((b) => (b.id === block.id ? ({ ...b, ...next } as Section) : b)),
                    )
                  }
                  onToggle={() =>
                    setBlocks((current) =>
                      current.map((b) =>
                        b.id === block.id ? { ...b, isVisible: !b.isVisible } : b,
                      ),
                    )
                  }
                  onDuplicate={() =>
                    setBlocks((current) => [
                      ...current.slice(0, index + 1),
                      { ...block, id: newId() },
                      ...current.slice(index + 1),
                    ])
                  }
                  onRemove={() => setBlocks((current) => current.filter((b) => b.id !== block.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <p className="text-(--color-text-muted)">
            ยังไม่มีบล็อกในหน้านี้ เลือกชนิดแล้วกดเพิ่มเพื่อเริ่มต้น
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label
              htmlFor="add-block-type"
              className="block text-sm font-medium text-(--color-heading)"
            >
              เพิ่มบล็อกใหม่
            </label>
            <Select
              id="add-block-type"
              value={addType}
              onChange={(e) => setAddType(e.target.value as SectionType)}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_META[type].label}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => setBlocks((current) => [...current, emptySection(addType, newId())])}
            className="rounded-(--radius-control) bg-(--color-brand) px-4 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
          >
            เพิ่มบล็อก
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-(--color-heading)">ตัวอย่างหน้าเว็บ</h2>
        <p className="mt-1 text-[13px] text-(--color-text-muted)">
          แสดงผลด้วยส่วนประกอบชุดเดียวกับหน้าเว็บจริง ปรับลำดับหรือแก้ไขแล้วจะเห็นผลทันที
        </p>
        {/*
         * The preview renders storefront components, which read the public
         * message catalog; the admin has no NextIntlClientProvider of its own,
         * so it is supplied here.
         */}
        <div className="mt-3 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
          <div className="max-h-[80vh] overflow-y-auto">
            <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
              <Sections blocks={blocks} data={previewData} />
            </NextIntlClientProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

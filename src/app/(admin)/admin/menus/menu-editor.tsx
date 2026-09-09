"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { Button, FormBanner, Hint, Input, Label, Select } from "@/components/ui/field";
import { MENU_META, type MenuItems, type MenuLocation } from "@/lib/menus/schema";
import { saveMenuAction, type MenuFormState } from "./actions";

const INITIAL: MenuFormState = {};

function newId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function Fields({
  value,
  onChange,
  onRemove,
  removeLabel,
}: {
  value: { label: string; href: string; target: "self" | "blank" };
  onChange: (next: { label: string; href: string; target: "self" | "blank" }) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const labelId = useId();
  const hrefId = useId();
  const targetId = useId();

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div>
        <Label htmlFor={labelId}>ข้อความ</Label>
        <Input
          id={labelId}
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor={hrefId}>ลิงก์</Label>
        <Input
          id={hrefId}
          value={value.href}
          placeholder="/about"
          onChange={(e) => onChange({ ...value, href: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor={targetId}>เปิดที่</Label>
        <Select
          id={targetId}
          value={value.target}
          onChange={(e) => onChange({ ...value, target: e.target.value as "self" | "blank" })}
        >
          <option value="self">หน้าต่างเดิม</option>
          <option value="blank">หน้าต่างใหม่</option>
        </Select>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-(--radius-control) border border-(--color-border) px-3 py-2.5 text-sm text-(--color-text)"
      >
        {removeLabel}
      </button>
    </div>
  );
}

function ItemRow({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  item: MenuItems[number];
  index: number;
  total: number;
  onChange: (next: MenuItems[number]) => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-(--radius-card) border bg-(--color-bg) p-3 ${
        isDragging ? "border-(--color-brand)" : "border-(--color-border)"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`ลากเพื่อจัดลำดับ ${item.label || "เมนู"}`}
          className="cursor-grab rounded-(--radius-control) border border-(--color-border) px-2 py-1 text-sm text-(--color-text-muted)"
        >
          ⠿
        </button>
        <div className="ms-auto flex gap-2 text-sm">
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
        </div>
      </div>

      <Fields
        value={item}
        onChange={(next) => onChange({ ...item, ...next })}
        onRemove={onRemove}
        removeLabel="ลบเมนูนี้"
      />

      <ul className="mt-3 flex flex-col gap-3 border-s-2 border-(--color-border) ps-4">
        {item.children.map((child, childIndex) => (
          <li key={child.id}>
            <Fields
              value={child}
              onChange={(next) =>
                onChange({
                  ...item,
                  children: item.children.map((c, i) => (i === childIndex ? { ...c, ...next } : c)),
                })
              }
              onRemove={() =>
                onChange({
                  ...item,
                  children: item.children.filter((_, i) => i !== childIndex),
                })
              }
              removeLabel="ลบ"
            />
          </li>
        ))}
      </ul>

      {item.children.length < 12 && (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...item,
              children: [
                ...item.children,
                { id: newId(), label: "", href: "/", target: "self" as const },
              ],
            })
          }
          className="mt-3 text-sm text-(--color-brand) hover:underline"
        >
          เพิ่มเมนูย่อย
        </button>
      )}
    </li>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "กำลังบันทึก…" : "บันทึกเมนู"}
    </Button>
  );
}

/**
 * The menu builder for one location (SPEC.md §5, `/admin/menus`).
 *
 * One level of children, matching the schema and the header's single dropdown
 * row. Reordering has both a drag handle and up/down buttons, so it never
 * requires a mouse.
 */
export function MenuEditor({
  location,
  initial,
  usingDefault,
}: {
  location: MenuLocation;
  initial: MenuItems;
  usingDefault: boolean;
}) {
  const [items, setItems] = useState<MenuItems>(initial);
  const [state, formAction] = useActionState(saveMenuAction.bind(null, location), INITIAL);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    setItems((current) => arrayMove(current, from, to));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    setItems((current) => arrayMove(current, from, to));
  }

  return (
    <form
      action={formAction}
      className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-5"
    >
      <h2 className="text-lg font-semibold">{MENU_META[location].label}</h2>
      <p className="mt-1 text-sm text-(--color-text-muted)">{MENU_META[location].hint}</p>

      {usingDefault && (
        <p className="mt-4 rounded-(--radius-card) bg-(--color-surface) px-4 py-3 text-sm text-(--color-text)">
          ยังไม่เคยบันทึกเมนูนี้ ระบบกำลังใช้เมนูมาตรฐานที่ติดมากับเว็บไซต์
          (รวมรายการหมวดหมู่ที่อัปเดตอัตโนมัติ) เมื่อบันทึกแล้วรายการด้านล่างจะถูกใช้แทนทั้งหมด
        </p>
      )}

      {state.message && (
        <div className="mt-4">
          <FormBanner kind="success">{state.message}</FormBanner>
        </div>
      )}
      {state.error && (
        <div className="mt-4">
          <FormBanner kind="error">{state.error}</FormBanner>
        </div>
      )}

      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-5 flex flex-col gap-3">
            {items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                onMove={move}
                onChange={(next) =>
                  setItems((current) => current.map((i) => (i.id === item.id ? next : i)))
                }
                onRemove={() => setItems((current) => current.filter((i) => i.id !== item.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <p className="mt-5 text-(--color-text-muted)">ยังไม่มีรายการในเมนูนี้</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {items.length < 20 && (
          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                { id: newId(), label: "", href: "/", target: "self", children: [] },
              ])
            }
            className="rounded-(--radius-control) border border-(--color-border) px-4 py-2.5 text-sm text-(--color-text)"
          >
            เพิ่มเมนู
          </button>
        )}
        <SaveButton />
      </div>

      <Hint>ลิงก์ต้องขึ้นต้นด้วย / สำหรับหน้าภายในเว็บไซต์ หรือ https:// สำหรับลิงก์ภายนอก</Hint>
    </form>
  );
}

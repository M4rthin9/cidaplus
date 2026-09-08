"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { Button, FormBanner } from "@/components/ui/field";
import { reorderCategoriesAction } from "./actions";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  productCount: number;
  children: {
    id: string;
    name: string;
    slug: string;
    isPublished: boolean;
    productCount: number;
  }[];
};

function Row({ node, depth }: { node: CategoryNode["children"][number]; depth: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3" style={{ paddingInlineStart: depth * 24 }}>
      <Link
        href={`/admin/categories/${node.id}`}
        className="font-medium text-(--color-heading) hover:underline"
      >
        {node.name}
      </Link>
      <code className="text-xs text-(--color-text-muted)">/{node.slug}</code>
      <span className="text-xs text-(--color-text-muted)">สินค้า {node.productCount} รายการ</span>
      {node.isPublished ? (
        <span className="rounded-(--radius-control) bg-(--color-accent-tint) px-2 py-0.5 text-xs text-(--color-accent-ink)">
          เผยแพร่
        </span>
      ) : (
        <span className="rounded-(--radius-control) bg-(--color-surface) px-2 py-0.5 text-xs text-(--color-text-muted)">
          ฉบับร่าง
        </span>
      )}
    </div>
  );
}

function SortableItem({ node }: { node: CategoryNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        "border-b border-(--color-border) last:border-0 " + (isDragging ? "opacity-60" : "")
      }
    >
      <div className="flex items-start gap-3 py-3">
        <button
          type="button"
          aria-label={`ย้ายลำดับ ${node.name}`}
          className="mt-0.5 cursor-grab rounded-(--radius-control) px-2 py-1 text-(--color-text-muted) hover:bg-(--color-surface) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand)"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <Row node={node} depth={0} />
          {node.children.map((child) => (
            <Row key={child.id} node={child} depth={1} />
          ))}
        </div>
      </div>
    </li>
  );
}

/** Drag-to-reorder with keyboard support; §5 wants a tree, nested one level. */
export function CategoryTree({ initial }: { initial: CategoryNode[] }) {
  const [nodes, setNodes] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * dnd-kit ships English announcements that read out the raw UUID
   * ("Draggable item 01a07e37-... was moved over droppable area 01a07e37-...").
   * Every admin-facing string is Thai (CLAUDE.md), and a screen reader is
   * admin-facing, so these are replaced with the category names.
   */
  const nameOf = (id: string | number | undefined) =>
    nodes.find((n) => n.id === id)?.name ?? "หมวดหมู่";

  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) =>
      `เริ่มย้ายลำดับ ${nameOf(active.id)} ใช้ปุ่มลูกศรขึ้นลงเพื่อเลือกตำแหน่ง แล้วกด Space เพื่อวาง`,
    onDragOver: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) => (over ? `ย้าย ${nameOf(active.id)} ไปอยู่ตำแหน่งของ ${nameOf(over.id)}` : ""),
    onDragEnd: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) =>
      over
        ? `วาง ${nameOf(active.id)} ที่ตำแหน่งของ ${nameOf(over.id)} เรียบร้อยแล้ว`
        : `ยกเลิกการย้าย ${nameOf(active.id)}`,
    onDragCancel: ({ active }: { active: { id: string | number } }) =>
      `ยกเลิกการย้าย ${nameOf(active.id)}`,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = nodes.findIndex((n) => n.id === active.id);
    const newIndex = nodes.findIndex((n) => n.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(nodes, oldIndex, newIndex);
    setNodes(next);
    setStatus(null);

    startTransition(async () => {
      const result = await reorderCategoriesAction(next.map((n) => n.id));
      setStatus(result.message ?? null);
    });
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-8 text-center">
        <p className="text-(--color-text)">ยังไม่มีหมวดหมู่</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status ? <FormBanner kind="success">{status}</FormBanner> : null}
      <p aria-live="polite" className="sr-only">
        {pending ? "กำลังบันทึกลำดับ" : (status ?? "")}
      </p>
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) px-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "กด Space เพื่อเริ่มย้ายลำดับ ใช้ปุ่มลูกศรขึ้นลงเพื่อเลือกตำแหน่งใหม่ กด Space อีกครั้งเพื่อวาง หรือกด Escape เพื่อยกเลิก",
            },
          }}
        >
          <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <ul>
              {nodes.map((node) => (
                <SortableItem key={node.id} node={node} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
      <p className="text-sm text-(--color-text-muted)">
        ลากปุ่ม ⠿ เพื่อจัดลำดับ หรือกด Tab ไปที่ปุ่มแล้วใช้ Space และปุ่มลูกศร
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setNodes(initial)}
        disabled={pending}
      >
        ย้อนกลับลำดับเดิม
      </Button>
    </div>
  );
}

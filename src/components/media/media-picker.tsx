"use client";

import { useEffect, useId, useState } from "react";
import { Button, Input } from "@/components/ui/field";
import { derivativeName, focalPosition, mediaUrl } from "@/lib/media/urls";
import type { ThumbMedia } from "./media-thumb";

/**
 * Reusable media picker. Phases 4 and 5 mount this from the product and post
 * editors; nothing consumes it yet, so it is deliberately self-contained and
 * takes its items as a prop rather than fetching.
 */
export type PickerItem = ThumbMedia & { alt: string | null };

export function MediaPicker({
  items,
  value,
  onChange,
  multiple = false,
  triggerLabel = "เลือกรูปภาพ",
}: {
  items: readonly PickerItem[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? items.filter(
        (m) =>
          m.filename.toLowerCase().includes(needle) || (m.alt ?? "").toLowerCase().includes(needle),
      )
    : items;

  function toggle(id: string) {
    if (!multiple) {
      onChange([id]);
      setOpen(false);
      return;
    }
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {triggerLabel}
        {value.length > 0 ? ` (${value.length})` : ""}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
            <div className="flex flex-wrap items-center gap-3 border-b border-(--color-border) p-4">
              <h2 id={titleId} className="text-lg font-semibold">
                คลังภาพ
              </h2>
              <Input
                id="picker-search"
                placeholder="ค้นหาชื่อไฟล์หรือคำอธิบายภาพ"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mt-0 ms-auto max-w-xs"
              />
            </div>

            <div className="overflow-y-auto p-4">
              {shown.length === 0 ? (
                <p className="py-8 text-center text-(--color-text-muted)">ไม่พบรูปภาพ</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {shown.map((m) => {
                    const selected = value.includes(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggle(m.id)}
                          aria-pressed={selected}
                          className={
                            "block w-full overflow-hidden rounded-(--radius-card) border-2 text-start " +
                            (selected ? "border-(--color-brand)" : "border-transparent")
                          }
                        >
                          <span
                            className="block overflow-hidden bg-(--color-surface-alt)"
                            style={{ aspectRatio: "1 / 1" }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={mediaUrl(m.storageKey, derivativeName(400, "jpeg"))}
                              alt={m.alt ?? ""}
                              loading="lazy"
                              className="size-full object-cover"
                              style={{ objectPosition: focalPosition(m.focalX, m.focalY) }}
                            />
                          </span>
                          <span className="block truncate p-2 text-xs text-(--color-text-muted)">
                            {m.filename}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-(--color-border) p-4">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ปิด
              </Button>
              {multiple ? (
                <Button type="button" onClick={() => setOpen(false)}>
                  เลือก {value.length} รูป
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

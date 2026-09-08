"use client";

import { useActionState, useState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label } from "@/components/ui/field";
import { derivativeName, focalPosition, mediaUrl } from "@/lib/media/urls";
import { updateMediaAction, type MediaFormState } from "../actions";

const initial: MediaFormState = {};

export function MediaDetailForm({
  mediaId,
  storageKey,
  defaults,
}: {
  mediaId: string;
  storageKey: string;
  defaults: { alt: string; tags: string; focalX: number; focalY: number };
}) {
  const action = updateMediaAction.bind(null, mediaId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [focal, setFocal] = useState({ x: defaults.focalX, y: defaults.focalY });

  return (
    <form action={formAction} className="grid gap-6 md:grid-cols-2" noValidate>
      <div className="space-y-3">
        {/* Click to set the focal point — the non-destructive alternative to cropping. */}
        <button
          type="button"
          className="block w-full cursor-crosshair overflow-hidden rounded-(--radius-card) border border-(--color-border)"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setFocal({
              x: Math.round(((e.clientX - r.left) / r.width) * 100),
              y: Math.round(((e.clientY - r.top) / r.height) * 100),
            });
          }}
        >
          <span className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(storageKey, derivativeName(800, "jpeg"))}
              alt=""
              className="block w-full"
            />
            <span
              aria-hidden="true"
              className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ring-2 ring-(--color-brand)"
              style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
            />
          </span>
        </button>
        <Hint>คลิกบนภาพเพื่อกำหนดจุดโฟกัส ระบบจะครอบภาพรอบจุดนี้เมื่อแสดงในสัดส่วนอื่น</Hint>

        <div className="grid grid-cols-2 gap-3">
          {(["product", "cover"] as const).map((aspect) => (
            <div key={aspect}>
              <p className="mb-1 text-xs text-(--color-text-muted)">
                {aspect === "product" ? "ตัวอย่าง 3:4 (สินค้า)" : "ตัวอย่าง 16:9 (ปกข่าว)"}
              </p>
              <span
                className="block overflow-hidden rounded-(--radius-card) bg-(--color-surface-alt)"
                style={{ aspectRatio: aspect === "product" ? "3 / 4" : "16 / 9" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(storageKey, derivativeName(400, "jpeg"))}
                  alt=""
                  className="size-full object-cover"
                  style={{ objectPosition: focalPosition(focal.x, focal.y) }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {state.message ? (
          <FormBanner kind={state.errors ? "error" : "success"}>{state.message}</FormBanner>
        ) : null}

        <div>
          <Label htmlFor="alt" required>
            คำอธิบายภาพ (alt)
          </Label>
          <Input
            id="alt"
            name="alt"
            defaultValue={defaults.alt}
            required
            error={state.errors?.alt}
          />
          <FieldError id="alt-error" message={state.errors?.alt} />
        </div>

        <div>
          <Label htmlFor="tags">แท็ก</Label>
          <Input id="tags" name="tags" defaultValue={defaults.tags} placeholder="พวงหรีด, ดอกไม้" />
          <Hint>คั่นด้วยเครื่องหมายจุลภาค</Hint>
        </div>

        <input type="hidden" name="focalX" value={focal.x} />
        <input type="hidden" name="focalY" value={focal.y} />
        <p className="text-sm text-(--color-text-muted)">
          จุดโฟกัส {focal.x}% {focal.y}%
        </p>

        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}

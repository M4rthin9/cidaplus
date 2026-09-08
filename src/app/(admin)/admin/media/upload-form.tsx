"use client";

import { useActionState, useRef, useState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label } from "@/components/ui/field";
import { ACCEPT_ATTRIBUTE } from "@/lib/media/magic";
import { MAX_BATCH_BYTES, MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { uploadMediaAction, type MediaFormState } from "./actions";

const initial: MediaFormState = {};

/** Drag-and-drop, multi-select and paste-from-clipboard (SPEC.md §9). */
export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadMediaAction, initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mb = (n: number) => Math.round(n / 1024 / 1024);

  /**
   * Refuse an oversized selection here. Next rejects the whole Server Action
   * body above `serverActions.bodySizeLimit` before any of our code runs, so
   * without this check the upload fails with nothing shown to the operator.
   */
  function validate(files: File[]): boolean {
    const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setLocalError(`ไฟล์ "${tooBig.name}" ใหญ่เกิน ${mb(MAX_UPLOAD_BYTES)} MB`);
      return false;
    }
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_BATCH_BYTES) {
      setLocalError(
        `ไฟล์ที่เลือกรวมกัน ${mb(total)} MB เกิน ${mb(MAX_BATCH_BYTES)} MB กรุณาแบ่งอัปโหลดเป็นหลายรอบ`,
      );
      return false;
    }
    setLocalError(null);
    return true;
  }

  function adopt(list: FileList | null) {
    if (!list || list.length === 0 || !inputRef.current) return;
    const transfer = new DataTransfer();
    for (const file of Array.from(list)) transfer.items.add(file);
    inputRef.current.files = transfer.files;
    const files = Array.from(list);
    setNames(files.map((f) => f.name));
    validate(files);
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-6"
      onPaste={(e) => adopt(e.clipboardData.files)}
      noValidate
    >
      {localError ? <FormBanner kind="error">{localError}</FormBanner> : null}
      {state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}
      {state.uploaded && !state.message ? (
        <FormBanner kind="success">อัปโหลดสำเร็จ {state.uploaded} ไฟล์</FormBanner>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          adopt(e.dataTransfer.files);
        }}
        className={
          "rounded-(--radius-card) border-2 border-dashed p-8 text-center transition-colors " +
          (dragging ? "border-(--color-brand) bg-(--color-brand-tint)" : "border-(--color-border)")
        }
      >
        <p className="text-(--color-heading)">ลากไฟล์มาวางที่นี่ หรือวางจากคลิปบอร์ด (Ctrl+V)</p>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          รองรับ JPEG, PNG, WebP, AVIF · ไฟล์ละไม่เกิน {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}{" "}
          MB · เลือกได้หลายไฟล์
        </p>

        <input
          ref={inputRef}
          id="files"
          name="files"
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setNames(files.map((f) => f.name));
            validate(files);
          }}
          className="mt-4 block w-full text-sm text-(--color-text) file:me-3 file:rounded-(--radius-control) file:border file:border-(--color-border) file:bg-(--color-surface) file:px-4 file:py-2.5 file:text-sm"
        />

        {names.length > 0 ? (
          <p className="mt-3 text-sm text-(--color-text)">
            เลือกแล้ว {names.length} ไฟล์: {names.slice(0, 4).join(", ")}
            {names.length > 4 ? " …" : ""}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="alt" required>
          คำอธิบายภาพ (alt)
        </Label>
        <Input id="alt" name="alt" required error={state.errors?.alt} />
        <FieldError id="alt-error" message={state.errors?.alt} />
        <Hint>จำเป็นต้องมีก่อนเผยแพร่ ใช้กับทุกไฟล์ในรอบนี้ แก้ไขรายไฟล์ได้ภายหลัง</Hint>
      </div>

      <Button type="submit" disabled={pending || localError !== null}>
        {pending ? "กำลังอัปโหลดและสร้างไฟล์ย่อ…" : "อัปโหลด"}
      </Button>
    </form>
  );
}

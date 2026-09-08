"use client";

import { useActionState } from "react";
import { Button, FieldError, FormBanner, Hint, Input, Label, Select } from "@/components/ui/field";
import { PASSWORD_MIN } from "@/lib/validation/user";
import type { UserFormState } from "./actions";

const initial: UserFormState = {};

type Props = {
  action: (prev: UserFormState, formData: FormData) => Promise<UserFormState>;
  mode: "create" | "edit";
  defaults?: { email: string; name: string; role: "owner" | "editor"; isActive: boolean };
};

export function UserForm({ action, mode, defaults }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="max-w-lg space-y-5" noValidate>
      {state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}

      <div>
        <Label htmlFor="email" required={mode === "create"}>
          อีเมล
        </Label>
        {mode === "create" ? (
          <>
            <Input id="email" name="email" type="email" required error={state.errors?.email} />
            <FieldError id="email-error" message={state.errors?.email} />
          </>
        ) : (
          <>
            <Input id="email" type="email" defaultValue={defaults?.email} disabled />
            <Hint>ไม่สามารถเปลี่ยนอีเมลได้</Hint>
          </>
        )}
      </div>

      <div>
        <Label htmlFor="name" required>
          ชื่อ–นามสกุล
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaults?.name}
          error={state.errors?.name}
        />
        <FieldError id="name-error" message={state.errors?.name} />
      </div>

      <div>
        <Label htmlFor="role" required>
          สิทธิ์การใช้งาน
        </Label>
        <Select
          id="role"
          name="role"
          defaultValue={defaults?.role ?? "editor"}
          error={state.errors?.role}
        >
          <option value="editor">ผู้แก้ไข — จัดการเนื้อหาได้</option>
          <option value="owner">ผู้ดูแลสูงสุด — จัดการผู้ใช้ได้ด้วย</option>
        </Select>
        <FieldError id="role-error" message={state.errors?.role} />
      </div>

      <div>
        <Label htmlFor="password" required={mode === "create"}>
          รหัสผ่าน
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={mode === "create"}
          error={state.errors?.password}
        />
        <FieldError id="password-error" message={state.errors?.password} />
        <Hint>
          {mode === "create"
            ? `อย่างน้อย ${PASSWORD_MIN} ตัวอักษร`
            : "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน การเปลี่ยนรหัสผ่านจะทำให้ต้องเข้าสู่ระบบใหม่ทุกอุปกรณ์"}
        </Hint>
      </div>

      {mode === "edit" ? (
        <div className="flex items-start gap-2.5">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={defaults?.isActive}
            className="mt-1 size-4 accent-(--color-brand)"
          />
          <label htmlFor="isActive" className="text-sm text-(--color-heading)">
            เปิดใช้งานบัญชีนี้
            <span className="block text-(--color-text-muted)">
              ปิดใช้งานแล้วจะออกจากระบบทันทีทุกอุปกรณ์
            </span>
          </label>
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "กำลังบันทึก…"
            : mode === "create"
              ? "เพิ่มผู้ดูแลระบบ"
              : "บันทึกการเปลี่ยนแปลง"}
        </Button>
      </div>
    </form>
  );
}

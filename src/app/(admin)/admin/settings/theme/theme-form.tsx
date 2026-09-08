"use client";

import { useActionState, useState } from "react";
import { Button, FieldError, FormBanner, Hint } from "@/components/ui/field";
import { contrastChecks, themeStyle } from "@/lib/settings/theme";
import type { GlobalValue } from "@/lib/settings/registry";
import type { SettingsFormState } from "../actions";

const initial: SettingsFormState = {};

type Theme = GlobalValue<"theme">;

const COLOUR_FIELDS: { name: keyof Theme; label: string; note?: string }[] = [
  { name: "colorBg", label: "พื้นหลัง" },
  { name: "colorSurface", label: "พื้นรอง", note: "แถบส่วน การ์ด ช่องกรอก" },
  { name: "colorSurfaceAlt", label: "พื้นรูปภาพ", note: "ช่องภาพที่ยังไม่มีรูป" },
  { name: "colorHeading", label: "หัวข้อ" },
  { name: "colorText", label: "ข้อความเนื้อหา" },
  { name: "colorTextMuted", label: "ข้อความรอง" },
  { name: "colorBrand", label: "สีหลัก (ตราครุยราชทัณฑ์)", note: "ลิงก์ เมนู เส้นใต้หัวข้อ" },
  { name: "colorBrandHover", label: "สีหลักเมื่อชี้เมาส์" },
  { name: "colorBrandTint", label: "สีหลักอ่อน" },
  { name: "colorAccent", label: "สีปุ่ม LINE", note: "ใช้กับการติดต่อผ่าน LINE เท่านั้น" },
  { name: "colorAccentTint", label: "สี LINE อ่อน" },
  { name: "colorAccentInk", label: "ข้อความบนพื้น LINE อ่อน" },
  { name: "colorBorder", label: "เส้นขอบ" },
  { name: "colorSealGold", label: "สีทองในตรา", note: "ใช้ภายในตราเท่านั้น ไม่ใช้กับข้อความ" },
];

const NUMBER_FIELDS: {
  name: keyof Theme;
  label: string;
  min: number;
  max: number;
  unit: string;
}[] = [
  { name: "radiusCard", label: "ความมนของการ์ด", min: 0, max: 32, unit: "px" },
  { name: "radiusControl", label: "ความมนของปุ่ม", min: 0, max: 32, unit: "px" },
  { name: "containerWidth", label: "ความกว้างเนื้อหาสูงสุด", min: 768, max: 1920, unit: "px" },
];

export function ThemeForm({
  action,
  defaults,
}: {
  action: (prev: SettingsFormState, fd: FormData) => Promise<SettingsFormState>;
  defaults: Theme;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [theme, setTheme] = useState<Theme>(defaults);

  const set = (name: keyof Theme, value: string) =>
    setTheme((t) => ({
      ...t,
      [name]: name.startsWith("radius") || name === "containerWidth" ? Number(value) : value,
    }));

  const checks = contrastChecks(theme);
  const failures = checks.filter((c) => !c.passes);

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_20rem]" noValidate>
      <div className="space-y-6">
        {state.message ? (
          <FormBanner kind={state.errors ? "error" : "success"}>{state.message}</FormBanner>
        ) : null}

        {failures.length > 0 ? (
          <FormBanner kind="error">
            มี {failures.length} คู่สีที่ความต่างของสีต่ำกว่ามาตรฐาน WCAG AA (4.5:1) —
            เว็บไซต์ภาครัฐต้องผ่านมาตรฐานนี้ กรุณาตรวจสอบรายการด้านขวาก่อนบันทึก
          </FormBanner>
        ) : null}

        <fieldset>
          <legend className="text-sm font-medium text-(--color-heading)">สี</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {COLOUR_FIELDS.map((f) => (
              <div key={f.name}>
                <label
                  htmlFor={f.name}
                  className="block text-sm font-medium text-(--color-heading)"
                >
                  {f.label}
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={`เลือกสี ${f.label}`}
                    value={String(theme[f.name])}
                    onChange={(e) => set(f.name, e.target.value)}
                    className="size-10 shrink-0 cursor-pointer rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) p-1"
                  />
                  <input
                    id={f.name}
                    name={f.name}
                    value={String(theme[f.name])}
                    onChange={(e) => set(f.name, e.target.value)}
                    className="block w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-3 py-2.5 font-mono text-sm text-(--color-heading) focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                  />
                </div>
                <FieldError id={`${f.name}-error`} message={state.errors?.[f.name]} />
                {f.note ? <Hint>{f.note}</Hint> : null}
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-(--color-heading)">รูปทรงและความกว้าง</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {NUMBER_FIELDS.map((f) => (
              <div key={f.name}>
                <label
                  htmlFor={f.name}
                  className="block text-sm font-medium text-(--color-heading)"
                >
                  {f.label} ({f.unit})
                </label>
                <input
                  id={f.name}
                  name={f.name}
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={String(theme[f.name])}
                  onChange={(e) => set(f.name, e.target.value)}
                  className="mt-1.5 block w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-base text-(--color-heading) focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                />
                <FieldError id={`${f.name}-error`} message={state.errors?.[f.name]} />
              </div>
            ))}
          </div>
        </fieldset>

        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกธีม"}
        </Button>
      </div>

      {/* Live preview: the same custom properties the site renders, scoped to this box. */}
      <aside className="space-y-4">
        <section>
          <h2 className="text-sm font-medium text-(--color-heading)">ตัวอย่าง</h2>
          <div
            style={themeStyle(theme)}
            className="mt-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-4"
          >
            <p className="text-xs text-(--color-text-muted)">กรมราชทัณฑ์ กระทรวงยุติธรรม</p>
            <h3 className="mt-1 text-lg font-semibold text-(--color-heading)">
              ทัณฑสถานบำบัดพิเศษกลาง
            </h3>
            <div className="mt-3 h-0.5 w-12 rounded-full bg-(--color-seal-gold)" />
            <p className="mt-3 text-sm leading-[1.8] text-(--color-text)">
              พวงหรีดดอกไม้ประดิษฐ์ ผลิตโดยผู้เข้ารับการบำบัด
            </p>
            <p className="mt-3">
              <span className="inline-block rounded-(--radius-control) bg-(--color-accent) px-4 py-2.5 text-sm text-white">
                สั่งซื้อ / สอบถามทาง LINE
              </span>
            </p>
            <p className="mt-2">
              <span className="text-sm text-(--color-brand) underline">ดูสินค้าทั้งหมด</span>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-(--color-heading)">ความต่างของสี (WCAG AA)</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-baseline justify-between gap-2">
                <span className="text-(--color-text)">{c.label}</span>
                <span
                  className={
                    "shrink-0 font-mono text-xs " +
                    (c.passes ? "text-(--color-accent-ink)" : "text-(--color-brand)")
                  }
                >
                  {c.ratio.toFixed(2)}:1 {c.passes ? "ผ่าน" : "ไม่ผ่าน"}
                </span>
              </li>
            ))}
          </ul>
          <Hint>ต้องได้อย่างน้อย 4.5:1 สำหรับข้อความปกติ</Hint>
        </section>
      </aside>
    </form>
  );
}

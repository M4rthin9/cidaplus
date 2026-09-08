import { z } from "zod";
import { linkHref } from "@/lib/sections/schema";

/**
 * Menu item tree. SPEC.md §6: `menu_i18n.items` is a
 * `{label, href, children[], target}` tree.
 *
 * One level of children, not arbitrary depth. docs/DESIGN.md's header is a
 * single dropdown row and §5 nests categories one level; an arbitrarily deep
 * tree would be a navigation the site cannot render and the operator cannot
 * see, which is worse than a cap.
 *
 * A third level is *stripped* rather than rejected — Zod drops unknown keys —
 * so surplus depth costs the operator the extra level and nothing else. An
 * invalid `href` is different: that is bad data, and it takes its item with it.
 */
const label = z.string().trim().min(1, "กรุณากรอกข้อความเมนู").max(120);

const target = z.enum(["self", "blank"]).default("self");

const leafSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label,
  href: linkHref,
  target,
});

export const menuItemSchema = leafSchema.extend({
  children: z.array(leafSchema).max(12).default([]),
});

export const menuItemsSchema = z.array(menuItemSchema).max(20);

export type MenuLeaf = z.infer<typeof leafSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuItems = MenuItem[];

export const MENU_LOCATIONS = ["header", "footer_a", "footer_b"] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const MENU_META: Record<MenuLocation, { label: string; hint: string }> = {
  header: { label: "เมนูส่วนหัว", hint: "แถบนำทางด้านบนของทุกหน้า รองรับเมนูย่อยหนึ่งชั้น" },
  footer_a: { label: "เมนูส่วนท้าย คอลัมน์ที่ 1", hint: "คอลัมน์ลิงก์สำคัญในส่วนท้าย" },
  footer_b: { label: "เมนูส่วนท้าย คอลัมน์ที่ 2", hint: "คอลัมน์ลิงก์เพิ่มเติมในส่วนท้าย" },
};

/**
 * Rebuild against the schema, dropping items that do not parse — the same
 * posture as the rich-text whitelist and the section builder. An `href` that
 * fails `linkHref` takes its item with it rather than rendering a live
 * `javascript:` link in the site's navigation.
 */
export function sanitizeMenuItems(input: unknown): MenuItems {
  if (!Array.isArray(input)) return [];

  const out: MenuItems = [];
  for (const raw of input) {
    const result = menuItemSchema.safeParse(raw);
    if (result.success) out.push(result.data);
  }
  return out.slice(0, 20);
}

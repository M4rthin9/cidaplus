import { z } from "zod";

/**
 * The typed settings registry. SPEC.md §6.
 *
 * "Do not use a loose key-value bag. Define a typed registry: one Zod schema
 * per settings key, with defaults, so getSetting('theme') is fully typed and a
 * missing row falls back to the default instead of crashing."
 *
 * §6 also says copy is stored per locale while structural values are global.
 * Several keys hold both — `general` has a site name (copy) and a logo id
 * (structural) — and storing the whole object per locale would duplicate the
 * structural half, which is exactly how values drift apart. So a key declares
 * two schemas: `global`, stored at locale `'*'`, and an optional `localized`,
 * stored once per locale. Reads merge them.
 */

/** Locale sentinel for a global row. Postgres cannot put NULL in a primary key. */
export { GLOBAL_LOCALE } from "@/db/schema/settings";

const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "ต้องเป็นรหัสสีแบบ #RRGGBB")
  .transform((v) => v.toLowerCase());

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.url("ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://").max(2048).optional(),
);

// --- general ---------------------------------------------------------------

const generalGlobal = z.object({
  logoMediaId: optionalText(36),
  faviconMediaId: optionalText(36),
  ogMediaId: optionalText(36),
});

const generalLocalized = z.object({
  siteName: z.string().trim().min(1, "กรุณากรอกชื่อเว็บไซต์").max(255),
  organisation: optionalText(255),
  tagline: optionalText(255),
  address: optionalText(500),
  businessHours: optionalText(255),
});

// --- contact ---------------------------------------------------------------

const contactGlobal = z.object({
  phone: optionalText(64),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.email("รูปแบบอีเมลไม่ถูกต้อง").max(255).optional(),
  ),
  mapEmbedUrl: optionalUrl,
  facebookUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

const contactLocalized = z.object({
  /** PDPA notice shown under the contact form (SPEC.md §10). */
  privacyNote: optionalText(1000),
});

// --- line ------------------------------------------------------------------

const lineGlobal = z.object({
  /**
   * The Official Account handle, e.g. "@355kxfoj" — the single source of truth
   * (§8). Stored as the handle rather than as §8's literal `oa_url` because the
   * two links the site needs are derived from it and cannot both be stored as
   * one URL: line.me/ti/p/<id> adds the friend, line.me/R/oaMessage/<id>/?<text>
   * opens a chat with the pre-filled message §8 requires. Phase 8 owns /go/line
   * and should confirm this shape.
   */
  oaId: z
    .string()
    .trim()
    .min(2, "กรุณากรอกรหัส LINE Official Account")
    .max(64)
    .regex(/^@?[A-Za-z0-9._-]+$/, "รหัส LINE ไม่ถูกต้อง")
    .transform((v) => (v.startsWith("@") ? v : `@${v}`)),
});

const lineLocalized = z.object({
  buttonLabel: z.string().trim().min(1, "กรุณากรอกข้อความบนปุ่ม").max(120),
  /** Supports {product_name} and {product_url} (§8). */
  messageTemplate: z.string().trim().min(1, "กรุณากรอกข้อความตั้งต้น").max(500),
});

// --- theme -----------------------------------------------------------------

const themeGlobal = z.object({
  colorBg: hex,
  colorSurface: hex,
  colorSurfaceAlt: hex,
  colorHeading: hex,
  colorText: hex,
  colorTextMuted: hex,
  colorBrand: hex,
  colorBrandHover: hex,
  colorBrandTint: hex,
  colorAccent: hex,
  colorAccentTint: hex,
  colorAccentInk: hex,
  colorBorder: hex,
  colorSealGold: hex,
  radiusCard: z.coerce.number().int().min(0).max(32),
  radiusControl: z.coerce.number().int().min(0).max(32),
  containerWidth: z.coerce.number().int().min(768).max(1920),
});

// --- seo -------------------------------------------------------------------

const seoGlobal = z.object({
  ga4Id: optionalText(32),
  gtmId: optionalText(32),
  ogMediaId: optionalText(36),
  /** Public queries stay unindexed until the operator opts in (§10, phase 10). */
  allowIndexing: z.coerce.boolean(),
});

const seoLocalized = z.object({
  defaultTitle: optionalText(255),
  titleTemplate: optionalText(255),
  defaultDescription: optionalText(500),
});

// --- registry --------------------------------------------------------------

/**
 * Defaults come from docs/DESIGN.md and SPEC.md, and are the values used when a
 * row is missing — so the site renders correctly against an empty settings
 * table, which is exactly the state a fresh deployment is in.
 */
export const SETTINGS = {
  general: {
    label: "ทั่วไป",
    global: generalGlobal,
    globalDefault: {} as z.infer<typeof generalGlobal>,
    localized: generalLocalized,
    localizedDefault: {
      siteName: "ทัณฑสถานบำบัดพิเศษกลาง",
      organisation: "กรมราชทัณฑ์ กระทรวงยุติธรรม",
    } as z.infer<typeof generalLocalized>,
  },
  contact: {
    label: "ติดต่อ",
    global: contactGlobal,
    globalDefault: {} as z.infer<typeof contactGlobal>,
    localized: contactLocalized,
    localizedDefault: {} as z.infer<typeof contactLocalized>,
  },
  line: {
    label: "LINE",
    global: lineGlobal,
    globalDefault: { oaId: "@355kxfoj" } as z.infer<typeof lineGlobal>,
    localized: lineLocalized,
    localizedDefault: {
      buttonLabel: "สั่งซื้อ / สอบถามทาง LINE",
      messageTemplate: "สนใจสอบถามสินค้า: {product_name} ({product_url})",
    } as z.infer<typeof lineLocalized>,
  },
  theme: {
    label: "ธีมและสี",
    global: themeGlobal,
    // Measured from the institutional seal — docs/DESIGN.md.
    globalDefault: {
      colorBg: "#ffffff",
      colorSurface: "#f8f6f5",
      colorSurfaceAlt: "#efeae8",
      colorHeading: "#241c1e",
      colorText: "#574e50",
      colorTextMuted: "#6f6467",
      colorBrand: "#880924",
      colorBrandHover: "#6d071d",
      colorBrandTint: "#f8f0f2",
      colorAccent: "#0b7a3f",
      colorAccentTint: "#e8f5ec",
      colorAccentInk: "#075c2f",
      colorBorder: "#e2dad8",
      colorSealGold: "#edd357",
      radiusCard: 8,
      radiusControl: 6,
      containerWidth: 1200,
    } as z.infer<typeof themeGlobal>,
    localized: undefined,
    localizedDefault: undefined,
  },
  seo: {
    label: "SEO",
    global: seoGlobal,
    globalDefault: { allowIndexing: false } as z.infer<typeof seoGlobal>,
    localized: seoLocalized,
    localizedDefault: {} as z.infer<typeof seoLocalized>,
  },
} as const;

export type SettingKey = keyof typeof SETTINGS;

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export type GlobalValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["global"]>;

export type LocalizedValue<K extends SettingKey> =
  (typeof SETTINGS)[K]["localized"] extends z.ZodType
    ? z.infer<NonNullable<(typeof SETTINGS)[K]["localized"]>>
    : Record<string, never>;

export type SettingValue<K extends SettingKey> = GlobalValue<K> & LocalizedValue<K>;

/**
 * Parse a stored row against its schema, falling back to the default rather
 * than throwing. A settings row written by an older version of the app must not
 * be able to take the site down.
 */
export function parseGlobal<K extends SettingKey>(key: K, raw: unknown): GlobalValue<K> {
  const def = SETTINGS[key];
  const result = def.global.safeParse({ ...def.globalDefault, ...(raw as object) });
  return (result.success ? result.data : def.globalDefault) as GlobalValue<K>;
}

export function parseLocalized<K extends SettingKey>(key: K, raw: unknown): LocalizedValue<K> {
  const def = SETTINGS[key];
  if (!def.localized) return {} as LocalizedValue<K>;
  const result = def.localized.safeParse({ ...def.localizedDefault, ...(raw as object) });
  return (result.success ? result.data : def.localizedDefault) as LocalizedValue<K>;
}

export function defaultsFor<K extends SettingKey>(key: K): SettingValue<K> {
  return {
    ...SETTINGS[key].globalDefault,
    ...(SETTINGS[key].localizedDefault ?? {}),
  } as SettingValue<K>;
}

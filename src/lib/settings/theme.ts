import type { GlobalValue } from "./registry";

/**
 * Theme values -> CSS custom properties. docs/DESIGN.md: "All values live in
 * settings.theme and render as CSS custom properties on <html>, so the admin
 * can retune them without a rebuild."
 *
 * Tailwind v4's `@theme` compiles every utility to `var(--color-*)`, so
 * redefining those properties on <html> retunes the whole site with no rebuild
 * and nothing in globals.css has to change.
 */

type Theme = GlobalValue<"theme">;

/** Property name per registry field. The one place the mapping is spelled out. */
const CSS_VARS: Record<keyof Theme, string> = {
  colorBg: "--color-bg",
  colorSurface: "--color-surface",
  colorSurfaceAlt: "--color-surface-alt",
  colorHeading: "--color-heading",
  colorText: "--color-text",
  colorTextMuted: "--color-text-muted",
  colorBrand: "--color-brand",
  colorBrandHover: "--color-brand-hover",
  colorBrandTint: "--color-brand-tint",
  colorAccent: "--color-accent",
  colorAccentTint: "--color-accent-tint",
  colorAccentInk: "--color-accent-ink",
  colorBorder: "--color-border",
  colorSealGold: "--color-seal-gold",
  radiusCard: "--radius-card",
  radiusControl: "--radius-control",
  containerWidth: "--container-site",
};

const PX_FIELDS = new Set<keyof Theme>(["radiusCard", "radiusControl", "containerWidth"]);

/**
 * A React `style` object for <html>. Returning an object rather than a CSS
 * string keeps this out of dangerouslySetInnerHTML territory entirely — the
 * values are operator input, and React escapes them as property values.
 */
export function themeStyle(theme: Theme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, prop] of Object.entries(CSS_VARS) as [keyof Theme, string][]) {
    const value = theme[field];
    out[prop] = PX_FIELDS.has(field) ? `${value}px` : String(value);
  }
  return out;
}

// --- contrast ---------------------------------------------------------------

/**
 * WCAG relative luminance. Thai public-sector guidance holds government sites
 * to WCAG 2.0 AA (SPEC.md §14, "Raised by the seal"), so the theme editor shows
 * live ratios rather than letting an operator discover the failure in an audit.
 */
export function relativeLuminance(hex: string): number {
  const v = hex.replace("#", "");
  const channel = (h: string) => {
    const u = parseInt(h, 16) / 255;
    return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(v.slice(0, 2));
  const g = channel(v.slice(2, 4));
  const b = channel(v.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastCheck = {
  readonly label: string;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
  /** 4.5:1 for normal text, the AA threshold that matters for body copy. */
  readonly passes: boolean;
};

const WHITE = "#ffffff";

/** The pairs that actually carry text in the design. */
export function contrastChecks(theme: Theme): ContrastCheck[] {
  const pairs: [string, string, string][] = [
    ["ข้อความเนื้อหาบนพื้นหลัง", theme.colorText, theme.colorBg],
    ["หัวข้อบนพื้นหลัง", theme.colorHeading, theme.colorBg],
    ["ข้อความรองบนพื้นหลัง", theme.colorTextMuted, theme.colorBg],
    ["ลิงก์บนพื้นหลัง", theme.colorBrand, theme.colorBg],
    ["ข้อความเนื้อหาบนพื้นรอง", theme.colorText, theme.colorSurface],
    ["ตัวอักษรขาวบนปุ่มหลัก", WHITE, theme.colorBrand],
    ["ตัวอักษรขาวบนปุ่ม LINE", WHITE, theme.colorAccent],
    ["ข้อความบนพื้น LINE อ่อน", theme.colorAccentInk, theme.colorAccentTint],
  ];

  return pairs.map(([label, foreground, background]) => {
    const ratio = contrastRatio(foreground, background);
    return { label, foreground, background, ratio, passes: ratio >= 4.5 };
  });
}

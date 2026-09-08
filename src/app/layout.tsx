import type { Metadata, Viewport } from "next";
import { getCachedSetting } from "@/lib/settings/cached";
import { themeStyle } from "@/lib/settings/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "ทัณฑสถานบำบัดพิเศษกลาง",
  description: "แคตตาล็อกผลิตภัณฑ์",
  robots: { index: false, follow: false }, // opened up in phase 10 with the real SEO pass
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /**
   * Theme tokens come from `settings.theme` and render as CSS custom properties
   * on <html> (docs/DESIGN.md). Tailwind v4 compiles every utility to
   * `var(--color-*)`, so redefining them here retunes the whole site — admin
   * and storefront — with no rebuild and no change to globals.css.
   */
  const theme = await getCachedSetting("theme");

  // Locale routing arrives in phase 7; v1 is Thai only (SPEC.md §14 decision 9).
  return (
    <html lang="th" style={themeStyle(theme)}>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only">
          ข้ามไปยังเนื้อหาหลัก
        </a>
        {children}
      </body>
    </html>
  );
}

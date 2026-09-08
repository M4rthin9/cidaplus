import type { Metadata, Viewport } from "next";
import { getCachedSetting } from "@/lib/settings/cached";
import { themeStyle } from "@/lib/settings/theme";
import { FontPreload, sharedViewport } from "@/lib/document-head";
import "../globals.css";

/**
 * Root layout for the admin. Separate from the storefront's because the
 * storefront's `<html lang>` has to come from the `[locale]` route param, and a
 * single shared root cannot see it — a layout above a dynamic segment does not
 * receive its params.
 *
 * The admin is Thai only, by design (§9), so `lang` is fixed here.
 */
export const metadata: Metadata = {
  title: { default: "ระบบจัดการเว็บไซต์", template: "%s — ระบบจัดการเว็บไซต์" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = sharedViewport;

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // The same tokens the storefront gets, so the admin previews the real theme.
  const theme = await getCachedSetting("theme");

  return (
    <html lang="th" dir="ltr" style={themeStyle(theme)}>
      <head>
        <FontPreload />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale routing arrives in phase 7; v1 is Thai only (SPEC.md §14 decision 9).
  return (
    <html lang="th">
      <body>
        <a href="#content" className="sr-only focus:not-sr-only">
          ข้ามไปยังเนื้อหาหลัก
        </a>
        {children}
      </body>
    </html>
  );
}

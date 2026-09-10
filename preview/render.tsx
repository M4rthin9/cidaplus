import { renderToString } from "react-dom/server";
import { PreviewApp } from "./app";
import { themeStyle } from "@/lib/settings/theme";
import { theme, general, routes } from "./data";
export { routes };
export function render(path: string) {
  const style = Object.entries(themeStyle(theme))
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  return `<!doctype html><html lang="th" dir="ltr" data-preview-path="${path}" style="${style}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="ตัวอย่างการออกแบบแคตตาล็อกผลิตภัณฑ์งานฝีมือ"><title>${general.siteName} — ตัวอย่างการออกแบบ</title><link rel="icon" href="/favicon.ico"><link rel="preload" href="/fonts/anuphan-thai.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/preview.css"></head><body><div id="root">${renderToString(<PreviewApp initialPath={path} />)}</div><script type="module" src="/preview.js"></script></body></html>`;
}

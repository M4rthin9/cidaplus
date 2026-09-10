import type { SectionsValue } from "@/lib/sections/schema";

/** Editable defaults only; a saved CMS homepage always takes precedence. */
export function defaultHomeSections(): SectionsValue {
  return [
    {
      id: "default-hero",
      type: "hero",
      isVisible: true,
      showSeal: true,
      useCraftIllustration: true,
      headline: "งานฝีมือที่ประณีต สร้างโอกาสที่ยั่งยืน",
      body: "เลือกชมผลิตภัณฑ์จากโครงการฝึกวิชาชีพ ทัณฑสถานบำบัดพิเศษกลาง ทุกชิ้นงานสะท้อนความตั้งใจในการเรียนรู้และพัฒนาทักษะ เพื่อเริ่มต้นชีวิตใหม่",
      ctaLabel: "เลือกชมผลิตภัณฑ์",
      ctaHref: "/categories",
    },
    { id: "default-featured", type: "featured_products", isVisible: true, limit: 8 },
    { id: "default-categories", type: "category_showcase", isVisible: true, categoryIds: [] },
    { id: "default-posts", type: "latest_posts", isVisible: true, limit: 3, postType: "all" },
  ];
}

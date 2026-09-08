import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { defaultHomeSections } from "@/lib/pages/store";
import { loadPreviewBase } from "../preview-base";
import { createPageAction } from "../actions";
import { PageForm } from "../page-form";

export const metadata: Metadata = { title: "สร้างหน้าใหม่" };

export default async function NewPagePage() {
  await requireAdmin();
  const { previewBase, media, categories, messages, locale } = await loadPreviewBase();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">สร้างหน้าใหม่</h1>
      <p className="text-sm text-(--color-text-muted)">
        ใช้รหัส <span className="lat">home</span> เพื่อสร้างหน้าแรก
        ระบบจะเริ่มต้นด้วยการจัดวางมาตรฐานที่เว็บไซต์ใช้อยู่
      </p>

      <PageForm
        action={createPageAction}
        defaults={{
          key: "",
          title: "",
          slug: "",
          isPublished: false,
          seoTitle: "",
          seoDescription: "",
        }}
        /* Starting from the shipped composition beats starting from nothing. */
        sections={defaultHomeSections()}
        unknownTypes={[]}
        media={media}
        categories={categories}
        previewBase={previewBase}
        messages={messages}
        locale={locale}
        submitLabel="สร้างหน้า"
        isHome={false}
        publicHref="/"
      />
    </div>
  );
}

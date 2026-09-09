import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pageI18n, pages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { HOME_PAGE_KEY } from "@/lib/pages/store";
import { parseSectionsForEditing } from "@/lib/sections/schema";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { FormBanner } from "@/components/ui/field";
import { loadPreviewBase } from "../preview-base";
import { deletePageAction, updatePageAction } from "../actions";
import { PageForm } from "../page-form";

export const metadata: Metadata = { title: "แก้ไขหน้า" };

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;

  const [row] = await db
    .select({
      id: pages.id,
      key: pages.key,
      isPublished: pages.isPublished,
      title: pageI18n.title,
      slug: pageI18n.slug,
      sections: pageI18n.sections,
      seoTitle: pageI18n.seoTitle,
      seoDescription: pageI18n.seoDescription,
    })
    .from(pages)
    .innerJoin(pageI18n, and(eq(pageI18n.pageId, pages.id), eq(pageI18n.locale, DEFAULT_LOCALE)))
    .where(eq(pages.id, id));

  if (!row) notFound();

  const { previewBase, media, categories, messages, locale } = await loadPreviewBase();

  // §6: unknown block types warn in the admin rather than vanishing silently.
  const parsed = parseSectionsForEditing(row.sections);
  const sections = parsed.flatMap((entry) => (entry.ok ? [entry.section] : []));
  const unknownTypes = parsed.flatMap((entry) =>
    entry.ok ? [] : [{ id: entry.id, type: entry.type }],
  );

  const isHome = row.key === HOME_PAGE_KEY;

  return (
    <div className="space-y-6">
      {created ? <FormBanner kind="success">สร้างหน้าเรียบร้อยแล้ว</FormBanner> : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        {!isHome && (
          <form
            action={async () => {
              "use server";
              await deletePageAction(id);
            }}
          >
            <button type="submit" className="text-sm text-(--color-brand) hover:underline">
              ลบหน้านี้
            </button>
          </form>
        )}
      </div>

      <PageForm
        action={updatePageAction.bind(null, id)}
        defaults={{
          key: row.key,
          title: row.title,
          slug: row.slug,
          isPublished: row.isPublished,
          seoTitle: row.seoTitle ?? "",
          seoDescription: row.seoDescription ?? "",
        }}
        sections={sections}
        unknownTypes={unknownTypes}
        media={media}
        categories={categories}
        previewBase={previewBase}
        messages={messages}
        locale={locale}
        submitLabel="บันทึก"
        isHome={isHome}
        publicHref={`/${row.slug}`}
      />
    </div>
  );
}

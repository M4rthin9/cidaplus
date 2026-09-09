"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { pageI18n, pages } from "@/db/schema";
import { diffFields, writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { HOME_PAGE_KEY } from "@/lib/pages/store";
import { sanitizeSections } from "@/lib/sections/schema";
import { pageSchema, type PageFormState } from "@/lib/validation/page";

function readForm(formData: FormData) {
  return {
    key: (formData.get("key") ?? "").toString(),
    title: (formData.get("title") ?? "").toString(),
    slug: (formData.get("slug") ?? "").toString(),
    isPublished: formData.get("isPublished") === "on",
    seoTitle: (formData.get("seoTitle") ?? "").toString(),
    seoDescription: (formData.get("seoDescription") ?? "").toString(),
  };
}

/**
 * The section array arrives as JSON from the builder rather than as flat form
 * fields — it is an ordered array of eleven different shapes, several of them
 * nested. `sanitizeSections` rebuilds it against the schema on the way in, so
 * the JSON is untrusted input like any other, not a trusted channel.
 */
function readSections(formData: FormData) {
  const raw = formData.get("sections");
  if (typeof raw !== "string") return [];
  try {
    return sanitizeSections(JSON.parse(raw));
  } catch {
    return [];
  }
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: PageFormState["errors"] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof NonNullable<PageFormState["errors"]>] = issue.message;
    }
  }
  return errors;
}

export async function createPageAction(
  _previous: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  const user = await requireAdmin();

  const parsed = pageSchema.safeParse(readForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.key, parsed.data.key));
  if (existing) return { errors: { key: "รหัสหน้านี้ถูกใช้แล้ว" } };

  const sections = readSections(formData);
  let pageId = "";

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(pages)
      .values({ key: parsed.data.key, isPublished: parsed.data.isPublished })
      .returning({ id: pages.id });
    if (!row) throw new Error("insert returned no row");
    pageId = row.id;

    await tx.insert(pageI18n).values({
      pageId: row.id,
      locale: DEFAULT_LOCALE,
      slug: parsed.data.slug,
      title: parsed.data.title,
      sections,
      seoTitle: parsed.data.seoTitle ?? null,
      seoDescription: parsed.data.seoDescription ?? null,
    });

    await writeAudit(tx, {
      userId: user.id,
      entity: "pages",
      entityId: row.id,
      action: "create",
      diff: diffFields(null, {
        key: parsed.data.key,
        title: parsed.data.title,
        slug: parsed.data.slug,
        isPublished: parsed.data.isPublished,
        sectionCount: sections.length,
      }),
    });
  });

  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${pageId}?created=1`);
}

export async function updatePageAction(
  pageId: string,
  _previous: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  const user = await requireAdmin();

  const parsed = pageSchema.safeParse(readForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  const [clash] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.key, parsed.data.key), ne(pages.id, pageId)));
  if (clash) return { errors: { key: "รหัสหน้านี้ถูกใช้แล้ว" } };

  const sections = readSections(formData);

  const [before] = await db
    .select({
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
    .where(eq(pages.id, pageId));

  if (!before) return { error: "ไม่พบหน้านี้" };

  await db.transaction(async (tx) => {
    await tx
      .update(pages)
      .set({ key: parsed.data.key, isPublished: parsed.data.isPublished, updatedAt: new Date() })
      .where(eq(pages.id, pageId));

    await tx
      .update(pageI18n)
      .set({
        title: parsed.data.title,
        slug: parsed.data.slug,
        sections,
        seoTitle: parsed.data.seoTitle ?? null,
        seoDescription: parsed.data.seoDescription ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(pageI18n.pageId, pageId), eq(pageI18n.locale, DEFAULT_LOCALE)));

    await writeAudit(tx, {
      userId: user.id,
      entity: "pages",
      entityId: pageId,
      action: "update",
      diff: diffFields(
        {
          key: before.key,
          title: before.title,
          slug: before.slug,
          isPublished: before.isPublished,
          // The whole array in a diff would be unreadable; the count is the
          // signal an operator actually scans an audit log for.
          sectionCount: Array.isArray(before.sections) ? before.sections.length : 0,
        },
        {
          key: parsed.data.key,
          title: parsed.data.title,
          slug: parsed.data.slug,
          isPublished: parsed.data.isPublished,
          sectionCount: sections.length,
        },
      ),
    });
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${pageId}`);

  /**
   * The public routes live under `[locale]`, so they must be revalidated by
   * their *route pattern*, not by the URL a visitor types. `revalidatePath("/")`
   * looks right and does nothing: the cache entry is keyed by the matched route,
   * which is `/[locale]`. Measured — the saved order sat in the database while
   * the homepage kept serving the previous render.
   */
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/[slug]", "page");

  return { message: "บันทึกเรียบร้อยแล้ว" };
}

export async function deletePageAction(pageId: string): Promise<void> {
  const user = await requireAdmin();

  const [before] = await db.select({ key: pages.key }).from(pages).where(eq(pages.id, pageId));
  if (!before) return;
  // The homepage is structural, not content: deleting it would leave the site
  // with no front door and no way to make one from this screen.
  if (before.key === HOME_PAGE_KEY) return;

  await db.transaction(async (tx) => {
    await tx.delete(pages).where(eq(pages.id, pageId));
    await writeAudit(tx, {
      userId: user.id,
      entity: "pages",
      entityId: pageId,
      action: "delete",
      diff: { key: { from: before.key, to: null } },
    });
  });

  revalidatePath("/admin/pages");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/[slug]", "page");
  redirect("/admin/pages?deleted=1");
}

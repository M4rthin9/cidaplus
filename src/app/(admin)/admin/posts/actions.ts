"use server";

import { revalidatePath } from "next/cache";
import { revalidatePosts } from "@/lib/cache/revalidate";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { media, postI18n, posts } from "@/db/schema";
import { diffFields, writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE, slugifyWithFallback } from "@/lib/slug";
import { EMPTY_DOC, referencedMediaIds, sanitizeDoc } from "@/lib/richtext/schema";
import { toPublishColumns } from "@/lib/validation/catalog";
import { postSchema } from "@/lib/validation/post";
import { fieldErrors } from "@/lib/validation/user";
import { freePostSlug, postSlugTaken, recordSlugRedirect } from "@/lib/catalog/slug-store";

export type PostFormState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
  /**
   * The submitted values, echoed back on a rejection.
   *
   * React 19 resets an uncontrolled `<form action={…}>` once the action
   * returns — including when it returns validation errors — and the reset also
   * desynchronises controlled `<select>`s, whose React value no longer matches
   * the DOM. Without this the editor lost the event dates, the venue, the type
   * and the publish state on every rejected save, keeping only the title.
   * The same failure was fixed on the public contact form in phase 7; this is
   * the admin half of it.
   */
  readonly values?: Record<string, string>;
};

/** Everything the form posts, so a rejection can hand it straight back. */
function submittedValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of [
    "type",
    "title",
    "slug",
    "excerpt",
    "coverMediaId",
    "publishState",
    "publishedAt",
    "eventStartAt",
    "eventEndAt",
    "eventLocation",
    "externalUrl",
  ]) {
    const value = formData.get(name);
    if (typeof value === "string") out[name] = value;
  }
  out.isFeatured = formData.get("isFeatured") === "on" ? "on" : "";
  return out;
}

function parse(formData: FormData) {
  return postSchema.safeParse({
    type: formData.get("type") ?? "news",
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body") ?? "",
    coverMediaId: formData.get("coverMediaId") ?? "",
    publishState: formData.get("publishState") ?? "draft",
    publishedAt: formData.get("publishedAt") ?? "",
    eventStartAt: formData.get("eventStartAt") ?? "",
    eventEndAt: formData.get("eventEndAt") ?? "",
    eventLocation: formData.get("eventLocation") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Rebuild the body against the whitelist, then drop any image whose media row
 * does not exist. The sanitizer guarantees the shape; only the database can
 * confirm the referenced image is real.
 */
async function safeBody(raw: string | undefined) {
  if (!raw) return EMPTY_DOC;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_DOC;
  }

  const doc = sanitizeDoc(parsed);
  const ids = referencedMediaIds(doc);
  if (ids.length === 0) return doc;

  const found = await db
    .select({ id: media.id })
    .from(media)
    .where(and(inArray(media.id, ids), isNull(media.deletedAt)));
  const live = new Set(found.map((r) => r.id));

  return {
    ...doc,
    content: doc.content.filter((b) => b.type !== "image" || live.has(b.attrs.mediaId)),
  };
}

export async function createPostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: submittedValues(formData) };

  const base = parsed.data.slug || slugifyWithFallback(parsed.data.title, "post");
  if (parsed.data.slug && (await postSlugTaken(DEFAULT_LOCALE, parsed.data.slug))) {
    return { errors: { slug: "ลิงก์นี้ถูกใช้แล้ว" }, values: submittedValues(formData) };
  }
  const slug = await freePostSlug(DEFAULT_LOCALE, base);
  const body = await safeBody(parsed.data.body);
  const publish = toPublishColumns(parsed.data.publishState, toDate(parsed.data.publishedAt));

  let newId = "";
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(posts)
      .values({
        type: parsed.data.type,
        coverMediaId: parsed.data.coverMediaId ?? null,
        eventStartAt: toDate(parsed.data.eventStartAt),
        eventEndAt: toDate(parsed.data.eventEndAt),
        eventLocation: parsed.data.eventLocation ?? null,
        externalUrl: parsed.data.externalUrl ?? null,
        isFeatured: parsed.data.isFeatured,
        authorId: user.id,
        ...publish,
      })
      .returning();
    if (!row) throw new Error("insert returned no row");
    newId = row.id;

    await tx.insert(postI18n).values({
      postId: row.id,
      locale: DEFAULT_LOCALE,
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt ?? null,
      body,
    });

    await writeAudit(tx, {
      userId: user.id,
      entity: "posts",
      entityId: row.id,
      action: "create",
      diff: diffFields(null, {
        title: parsed.data.title,
        slug,
        type: row.type,
        isPublished: row.isPublished,
      }),
    });
  });

  revalidatePath("/admin/posts");
  revalidatePosts();
  redirect(`/admin/posts/${newId}?created=1`);
}

export async function updatePostAction(
  postId: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success)
    return { errors: fieldErrors(parsed.error), values: submittedValues(formData) };

  const [before] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  const [beforeI18n] = await db
    .select()
    .from(postI18n)
    .where(and(eq(postI18n.postId, postId), eq(postI18n.locale, DEFAULT_LOCALE)))
    .limit(1);
  if (!before || !beforeI18n) return { message: "ไม่พบข่าวหรือกิจกรรมนี้" };

  const requested = parsed.data.slug || slugifyWithFallback(parsed.data.title, "post");
  if (requested !== beforeI18n.slug && (await postSlugTaken(DEFAULT_LOCALE, requested, postId))) {
    return { errors: { slug: "ลิงก์นี้ถูกใช้แล้ว" }, values: submittedValues(formData) };
  }
  const slug = await freePostSlug(DEFAULT_LOCALE, requested, postId);
  const body = await safeBody(parsed.data.body);
  const publish = toPublishColumns(parsed.data.publishState, toDate(parsed.data.publishedAt));

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(posts)
      .set({
        type: parsed.data.type,
        coverMediaId: parsed.data.coverMediaId ?? null,
        eventStartAt: toDate(parsed.data.eventStartAt),
        eventEndAt: toDate(parsed.data.eventEndAt),
        eventLocation: parsed.data.eventLocation ?? null,
        externalUrl: parsed.data.externalUrl ?? null,
        isFeatured: parsed.data.isFeatured,
        ...publish,
      })
      .where(eq(posts.id, postId))
      .returning();
    if (!after) throw new Error("update returned no row");

    await tx
      .update(postI18n)
      .set({ slug, title: parsed.data.title, excerpt: parsed.data.excerpt ?? null, body })
      .where(and(eq(postI18n.postId, postId), eq(postI18n.locale, DEFAULT_LOCALE)));

    if (before.isPublished) {
      await recordSlugRedirect(tx, "post", DEFAULT_LOCALE, beforeI18n.slug, slug);
    }

    await writeAudit(tx, {
      userId: user.id,
      entity: "posts",
      entityId: postId,
      action: "update",
      diff: diffFields(
        {
          title: beforeI18n.title,
          slug: beforeI18n.slug,
          type: before.type,
          isPublished: before.isPublished,
        },
        { title: parsed.data.title, slug, type: after.type, isPublished: after.isPublished },
      ),
    });
  });

  revalidatePath("/admin/posts");
  revalidatePosts();
  revalidatePath(`/admin/posts/${postId}`);
  return { message: "บันทึกเรียบร้อยแล้ว" };
}

export async function deletePostAction(postId: string): Promise<PostFormState> {
  const user = await requireAdmin();
  const [before] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!before) return { message: "ไม่พบข่าวหรือกิจกรรมนี้" };

  await db.transaction(async (tx) => {
    const [after] = await tx
      .update(posts)
      .set({ deletedAt: new Date(), isPublished: false })
      .where(eq(posts.id, postId))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      entity: "posts",
      entityId: postId,
      action: "delete",
      diff: diffFields({ deletedAt: null }, { deletedAt: after?.deletedAt ?? null }),
    });
  });

  revalidatePath("/admin/posts");
  revalidatePosts();
  redirect("/admin/posts?deleted=1");
}

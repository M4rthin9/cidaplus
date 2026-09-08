import { describe, expect, it } from "vitest";
import { categorySchema, fromPublishColumns, productSchema, toPublishColumns } from "./catalog";

const baseCategory = { name: "ดอกไม้ประดิษฐ์", slug: "ดอกไม้ประดิษฐ์", isPublished: true };
const baseProduct = {
  name: "พวงหรีด",
  slug: "พวงหรีด",
  categoryId: "cat-1",
  priceDisplay: "exact" as const,
  price: "1250",
  isFeatured: false,
  publishState: "draft" as const,
  mediaIds: [],
};

describe("empty optional fields become undefined, never ''", () => {
  it("category parentId — '' would be a foreign-key violation, not a null", () => {
    const r = categorySchema.safeParse({ ...baseCategory, parentId: "", heroMediaId: "" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.parentId).toBeUndefined();
    expect(r.data.heroMediaId).toBeUndefined();
  });

  it("category description", () => {
    const r = categorySchema.safeParse({ ...baseCategory, description: "   " });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.description).toBeUndefined();
  });

  it("product sku and shortDesc", () => {
    const r = productSchema.safeParse({ ...baseProduct, sku: "", shortDesc: "" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.sku).toBeUndefined();
    expect(r.data.shortDesc).toBeUndefined();
  });

  it("an empty price is accepted when the price is not shown", () => {
    const r = productSchema.safeParse({ ...baseProduct, priceDisplay: "contact", price: "" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.price).toBeUndefined();
  });
});

describe("productSchema", () => {
  it("requires a price when the price is shown exactly", () => {
    const r = productSchema.safeParse({ ...baseProduct, price: "" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.some((i) => i.path.includes("price"))).toBe(true);
  });

  it("rejects a non-numeric price", () => {
    expect(productSchema.safeParse({ ...baseProduct, price: "หนึ่งพัน" }).success).toBe(false);
  });

  it("requires a date when scheduled", () => {
    const r = productSchema.safeParse({
      ...baseProduct,
      publishState: "scheduled",
      publishedAt: "",
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.some((i) => i.path.includes("publishedAt"))).toBe(true);
  });

  it("accepts a Thai slug and rejects one with spaces", () => {
    expect(productSchema.safeParse({ ...baseProduct, slug: "พวงหรีด-กระดาษ" }).success).toBe(true);
    expect(productSchema.safeParse({ ...baseProduct, slug: "พวงหรีด กระดาษ" }).success).toBe(false);
  });

  it("rejects a slug with leading or trailing hyphens", () => {
    expect(productSchema.safeParse({ ...baseProduct, slug: "-x" }).success).toBe(false);
    expect(productSchema.safeParse({ ...baseProduct, slug: "x-" }).success).toBe(false);
  });
});

describe("publish state round-trip", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  const future = new Date("2026-12-01T00:00:00Z");
  const past = new Date("2026-01-01T00:00:00Z");

  it("draft clears published_at", () => {
    expect(toPublishColumns("draft", future)).toEqual({ isPublished: false, publishedAt: null });
  });

  it("scheduled keeps the future date and reads back as scheduled", () => {
    const cols = toPublishColumns("scheduled", future);
    expect(cols).toEqual({ isPublished: true, publishedAt: future });
    expect(fromPublishColumns(cols.isPublished, cols.publishedAt, now)).toBe("scheduled");
  });

  it("published stamps now when no date was given", () => {
    const cols = toPublishColumns("published", null);
    expect(cols.isPublished).toBe(true);
    expect(cols.publishedAt).toBeInstanceOf(Date);
  });

  it("a past published_at reads back as published, not scheduled", () => {
    expect(fromPublishColumns(true, past, now)).toBe("published");
  });

  it("unpublished always reads back as draft", () => {
    expect(fromPublishColumns(false, past, now)).toBe("draft");
  });
});

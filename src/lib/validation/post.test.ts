import { describe, expect, it } from "vitest";
import { postSchema } from "./post";

const news = {
  type: "news" as const,
  title: "เปิดจำหน่ายผลิตภัณฑ์ฝีมือผู้เข้ารับการบำบัด",
  slug: "poet-chamnai",
  excerpt: "",
  body: "",
  coverMediaId: "",
  publishState: "draft" as const,
  publishedAt: "",
  eventStartAt: "",
  eventEndAt: "",
  eventLocation: "",
  externalUrl: "",
  isFeatured: false,
};

const event = {
  ...news,
  type: "event" as const,
  title: "งานแสดงและจำหน่ายสินค้าผลิตภัณฑ์ราชทัณฑ์",
  slug: "ngan-sadaeng",
  eventStartAt: "2026-11-14T09:00",
};

function errorPaths(input: unknown): string[] {
  const result = postSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("postSchema — events", () => {
  it("accepts a minimal event", () => {
    expect(postSchema.safeParse(event).success).toBe(true);
  });

  it("requires a start date on an event", () => {
    expect(errorPaths({ ...event, eventStartAt: "" })).toContain("eventStartAt");
  });

  it("does not require a start date on news", () => {
    expect(postSchema.safeParse(news).success).toBe(true);
  });

  it("refuses an end before the start", () => {
    expect(
      errorPaths({ ...event, eventStartAt: "2026-11-14T09:00", eventEndAt: "2026-11-13T09:00" }),
    ).toContain("eventEndAt");
  });

  it("accepts an end equal to the start, for a single-moment event", () => {
    expect(
      postSchema.safeParse({
        ...event,
        eventStartAt: "2026-11-14T09:00",
        eventEndAt: "2026-11-14T09:00",
      }).success,
    ).toBe(true);
  });

  it("accepts a multi-day event", () => {
    expect(
      postSchema.safeParse({
        ...event,
        eventStartAt: "2026-11-14T09:00",
        eventEndAt: "2026-11-16T17:00",
      }).success,
    ).toBe(true);
  });
});

describe("postSchema — external registration link", () => {
  it("accepts an https registration link on an event", () => {
    const parsed = postSchema.safeParse({ ...event, externalUrl: "https://forms.gle/abc" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.externalUrl).toBe("https://forms.gle/abc");
  });

  it("refuses a javascript: registration link", () => {
    expect(errorPaths({ ...event, externalUrl: "javascript:alert(1)" })).toContain("externalUrl");
  });

  it("treats an empty link as absent rather than as an empty string", () => {
    const parsed = postSchema.safeParse(event);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.externalUrl).toBeUndefined();
  });

  it("refuses a registration link on a news post, where it would never render", () => {
    expect(errorPaths({ ...news, externalUrl: "https://forms.gle/abc" })).toContain("externalUrl");
  });
});

describe("postSchema — featured", () => {
  it("defaults to not featured", () => {
    const parsed = postSchema.safeParse({ ...news, isFeatured: undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isFeatured).toBe(false);
  });

  it("accepts a featured post", () => {
    const parsed = postSchema.safeParse({ ...news, isFeatured: true });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isFeatured).toBe(true);
  });
});

describe("postSchema — publishing", () => {
  it("requires a date when scheduling", () => {
    expect(errorPaths({ ...news, publishState: "scheduled" })).toContain("publishedAt");
  });

  it("accepts a scheduled post with a date", () => {
    expect(
      postSchema.safeParse({
        ...news,
        publishState: "scheduled",
        publishedAt: "2026-12-01T08:00",
      }).success,
    ).toBe(true);
  });
});

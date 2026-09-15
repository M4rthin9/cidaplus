import { expect, test } from "@playwright/test";
import { expectOnPage, must, expectSaved, saveButton, signIn, stamp } from "./helpers";

/**
 * Events are posts with `type = "event"` (the existing polymorphic model), and
 * they have their own public section. This covers the validation an operator
 * actually hits, the publish → appears path, and the upcoming/past split — which
 * is computed in SQL from the event's own dates, never from a flag.
 */
test.describe.configure({ mode: "serial" });

const id = stamp();
const TITLE = `กิจกรรมทดสอบ ${id}`;
/** An ASCII slug the teardown can find; see e2e/global-teardown.ts. */
const SLUG = `e2e-event-${id}`;

function isoLocal(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 16);
}

test("the form refuses bad input without losing what was typed", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/posts/new");

  await page.selectOption('select[name="type"]', "event");
  await page.fill('input[name="title"]', TITLE);
  await page.fill('input[name="eventStartAt"]', isoLocal(30));
  await page.fill('input[name="eventEndAt"]', isoLocal(20)); // before the start
  await page.fill('input[name="eventLocation"]', "ห้องประชุมทดสอบ");
  await page.fill('input[name="externalUrl"]', "javascript:alert(1)");
  await page.selectOption('select[name="publishState"]', "published");
  await saveButton(page, "title").click();

  await expect(page.getByText("วันสิ้นสุดต้องไม่มาก่อนวันเริ่ม")).toBeVisible();

  /**
   * React 19 resets the form once the action returns, errors included, and the
   * reset also desynchronises controlled selects. Every field below was blanked
   * before the action started echoing its values back — the whole event section
   * vanished, because `type` fell back to "news".
   */
  await expect(page.locator('input[name="title"]')).toHaveValue(TITLE);
  await expect(page.locator('select[name="type"]')).toHaveValue("event");
  await expect(page.locator('select[name="publishState"]')).toHaveValue("published");
  await expect(page.locator('input[name="eventLocation"]')).toHaveValue("ห้องประชุมทดสอบ");
  await expect(page.locator('input[name="eventStartAt"]')).not.toHaveValue("");
});

test("an unsafe registration link is refused", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/posts/new");
  await page.selectOption('select[name="type"]', "event");
  await page.fill('input[name="title"]', `${TITLE} ลิงก์`);
  await page.fill('input[name="eventStartAt"]', isoLocal(30));
  await page.fill('input[name="externalUrl"]', "javascript:alert(1)");
  await saveButton(page, "title").click();

  // z.url() alone accepts javascript: — validation/url.ts is what refuses it.
  await expect(page.getByText(/ขึ้นต้นด้วย https/)).toBeVisible();
  expect(page.url()).toContain("/admin/posts/new");
});

test("a published upcoming event appears under /events with its schema.org data", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/posts/new");

  await page.selectOption('select[name="type"]', "event");
  await page.fill('input[name="title"]', TITLE);
  await page.fill('input[name="slug"]', SLUG);
  await page.fill('input[name="eventStartAt"]', isoLocal(30));
  await page.fill('input[name="eventEndAt"]', isoLocal(31));
  await page.fill('input[name="eventLocation"]', "ห้องประชุมทดสอบ");
  await page.fill('input[name="externalUrl"]', "https://forms.gle/e2e");
  await page.selectOption('select[name="publishState"]', "published");
  await saveButton(page, "title").click();
  /**
   * Wait for an id, not for the `/admin/posts` prefix: the form itself lives at
   * `/admin/posts/new`, so a prefix match is already satisfied and the wait
   * returns before the save has even been attempted (CLAUDE.md records this
   * exact trap).
   */
  await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{8,}/);

  await expectOnPage(page, "/events", TITLE);

  // Under the upcoming heading, not the archive.
  const upcoming = page.locator("section, main").filter({ hasText: "กิจกรรมที่กำลังจะมาถึง" });
  await expect(upcoming.getByText(TITLE).first()).toBeVisible();

  const href = must(
    await page.getByRole("link", { name: TITLE }).first().getAttribute("href"),
    "an href on the event card",
  );
  expect(href).toContain("/events/");

  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByRole("link", { name: /ลงทะเบียน/ })).toBeVisible();

  const jsonLd = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  ).join();
  expect(jsonLd).toContain('"@type":"Event"');
  expect(jsonLd).toContain('"startDate"');
  // Nothing here sells a ticket, so no offers node may be invented.
  expect(jsonLd).not.toContain('"offers"');

  // The old /news URL for an event keeps working, permanently redirected.
  const slug = decodeURIComponent(must(href.split("/events/")[1], "a slug in the event href"));
  const redirected = await page.request.get(`/news/${encodeURIComponent(slug)}`, {
    maxRedirects: 0,
  });
  expect(redirected.status()).toBe(308);
  expect(redirected.headers()["location"]).toContain("/events/");
});

test("an unpublished event is not reachable publicly", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/posts");
  await page.getByRole("link", { name: TITLE }).first().click();
  await page.waitForURL(/\/admin\/posts\/[0-9a-f-]+/);

  await page.selectOption('select[name="publishState"]', "draft");
  await saveButton(page, "title").click();
  await expectSaved(page);

  await page.goto("/events");
  await expect(page.getByText(TITLE)).toHaveCount(0);
});

import { expect, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./global-setup";

/** Unique per run, so a repeated run never collides on a slug. */
export function stamp(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Sign in to the admin.
 *
 * The submit button is scoped to the form that owns the password field: the
 * admin layout renders its sign-out form before page content, so a bare
 * `button[type="submit"]` clicks *sign out* (CLAUDE.md, phases 3, 8 and 9).
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('form:has(input[name="password"]) button[type="submit"]');
  await page.waitForURL(/\/admin(?!\/login)/);
}

/**
 * Wait for a save to actually complete.
 *
 * Both update actions return "บันทึกเรียบร้อยแล้ว" in a banner. Matching a
 * looser /บันทึก/ instead matches the save *button* ("บันทึกการเปลี่ยนแปลง"),
 * which is on the page before the click — so the assertion passes immediately
 * and whatever comes next races the still-in-flight Server Action.
 */
export async function expectSaved(page: Page): Promise<void> {
  await expect(page.getByText("เรียบร้อยแล้ว").first()).toBeVisible();
}

/** The save button of an admin form, scoped by a field only that form owns. */
export function saveButton(page: Page, fieldName: string) {
  return page.locator(`form:has([name="${fieldName}"]) button[type="submit"]`).first();
}

/**
 * A storefront listing is ISR-cached for 60s, but every CMS write calls
 * `revalidatePath` (src/lib/cache/revalidate.ts) — so a published change must
 * be visible on the very next request. Asserting that directly is the point:
 * a sleep here would hide the bug this covers.
 */
export async function expectOnPage(page: Page, path: string, text: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}

export async function expectNotOnPage(page: Page, path: string, text: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByText(text, { exact: false })).toHaveCount(0);
}

/**
 * Narrow away a nullable without a non-null assertion — CLAUDE.md forbids `!`
 * without a justifying comment, and in a test the assertion is also the wrong
 * tool: a missing href should fail with a sentence saying what was missing,
 * not with "cannot read properties of null".
 */
export function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`expected ${what}, got ${value}`);
  return value;
}

/** The integer inside a "พบ N รายการ" style string. */
export function countIn(text: string | null, what: string): number {
  const match = must(text, what).match(/\d+/);
  return Number(must(match, `a number in ${what}`)[0]);
}

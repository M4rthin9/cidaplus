"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db/client";
import { diffFields, writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_LOCALE } from "@/lib/slug";
import { SETTINGS_TAG } from "@/lib/settings/cached";
import { SETTINGS, type SettingKey } from "@/lib/settings/registry";
import { bustSetting, getSetting, writeSetting } from "@/lib/settings/store";
import { fieldErrors } from "@/lib/validation/user";

export type SettingsFormState = {
  readonly errors?: Record<string, string>;
  readonly message?: string;
};

/** Form values arrive as strings; Zod's coercions handle numbers and booleans. */
function formToObject(formData: FormData, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(field);
    // An unchecked checkbox submits nothing at all.
    out[field] = raw === null ? false : raw;
  }
  return out;
}

/**
 * One action for every settings key. The global half is stored at locale '*'
 * and the localized half once per locale, so a structural value is never
 * duplicated across locales (SPEC.md §6).
 */
export async function saveSettingsAction(
  key: SettingKey,
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireAdmin();
  const def = SETTINGS[key];
  const locale = DEFAULT_LOCALE;

  const globalFields = Object.keys(def.global.shape);
  const localizedFields = def.localized ? Object.keys(def.localized.shape) : [];

  const globalParsed = def.global.safeParse(formToObject(formData, globalFields));
  if (!globalParsed.success) return { errors: fieldErrors(globalParsed.error) };

  let localizedParsed: unknown = undefined;
  if (def.localized) {
    const result = def.localized.safeParse(formToObject(formData, localizedFields));
    if (!result.success) return { errors: fieldErrors(result.error) };
    localizedParsed = result.data;
  }

  const before = await getSetting(key, locale);

  await db.transaction(async (tx) => {
    await writeSetting(tx, key, "global", locale, globalParsed.data, user.id);
    if (localizedParsed !== undefined) {
      await writeSetting(tx, key, "localized", locale, localizedParsed, user.id);
    }

    await writeAudit(tx, {
      userId: user.id,
      entity: "settings",
      entityId: key,
      action: "update",
      diff: diffFields(
        before as Record<string, unknown>,
        { ...globalParsed.data, ...(localizedParsed ?? {}) } as Record<string, unknown>,
      ),
    });
  });

  // In-memory TTL first, then Next's render cache: the public pages are
  // statically rendered and only regenerate when the tag is invalidated.
  // This pair is what makes a colour change reach the site with no rebuild.
  bustSetting(key);
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");

  return { message: "บันทึกเรียบร้อยแล้ว" };
}

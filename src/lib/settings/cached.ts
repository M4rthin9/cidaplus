import "server-only";

import { unstable_cache } from "next/cache";
import { DEFAULT_LOCALE } from "@/lib/slug";
import type { SettingKey, SettingValue } from "./registry";
import { getSetting } from "./store";

/**
 * Settings tag for Next's render cache.
 *
 * Two caches sit on top of each other and each earns its place:
 *
 *  - `TtlCache` (60s) keeps one server process from querying the database on
 *    every render, which is what §6 asks for.
 *  - Next's tagged cache lets public pages stay statically rendered. Without
 *    it a settings-driven layout would force every route dynamic and give up
 *    the static-fast rendering §10 requires. `revalidateTag(SETTINGS_TAG)` on
 *    write regenerates them, which is how a colour change reaches the public
 *    site with no rebuild.
 */
export const SETTINGS_TAG = "settings";

export function getCachedSetting<K extends SettingKey>(
  key: K,
  locale: string = DEFAULT_LOCALE,
): Promise<SettingValue<K>> {
  return unstable_cache(() => getSetting(key, locale), [`settings:${key}:${locale}`], {
    tags: [SETTINGS_TAG],
  })();
}

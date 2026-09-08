import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation. Use these in place of `next/link` and
 * `next/navigation` anywhere under `src/app/[locale]` — they carry the active
 * locale into every href, so the prefix rule lives in one place rather than at
 * each call site.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

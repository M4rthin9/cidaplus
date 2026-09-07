# CLAUDE.md

Multilingual product catalog website (Thai / English / Simplified Chinese) with a full admin CMS.
Self-hosted, Docker, one small VPS behind Cloudflare, at **cidapt.com**. Visitors browse; they never
buy on the site. Every product CTA hands off to a LINE Official Account where a human closes the
sale.

Read `docs/SPEC.md` for the full specification and `docs/DESIGN.md` before writing any UI.
Both are authoritative. This file is the summary you carry between sessions.

## Stack

Next.js 15 (App Router, TypeScript strict) · Postgres 16 · Drizzle ORM · next-intl · Auth.js v5
(admin only) · Tailwind v4 · shadcn/ui · Tiptap · sharp · Zod · Caddy · Cloudflare · Docker Compose ·
Node 22.

One Next.js process serves the storefront, the admin, and the API. No separate backend service.

## Commands

```
docker compose -f docker-compose.dev.yml up   # full local stack, seeded, localhost:3000
pnpm dev                                       # app only, against a running db
pnpm db:generate / db:migrate / db:seed        # drizzle-kit
pnpm typecheck / lint / test                   # must all pass before a phase is done
pnpm test:e2e                                  # playwright
```

## Non-negotiables

- **Never hard-code the LINE URL, phone number, email, or any color.** They live in the `settings`
  table and reach components as typed settings or CSS custom properties. One source of truth each.
- **Never hard-code a hex value in a component.** Use the tokens in `docs/DESIGN.md`.
- **Translatable text lives in `*_i18n` tables**, never in `name_th` / `name_en` columns. Thai is the
  fallback for every locale. Adding a language is a row insert, not a migration.
- **Never machine-translate content.** Seed and placeholder copy is Thai-only on purpose; English and
  Chinese wait for a human.
- **The contact form writes to the database before it tries to email.** SMTP is not configured yet
  and the form must still work — losing an enquiry is the worst failure this site can have.
- **No hotlinked assets.** The logo and every image live in the repo or the media library.
- **Thai typography is correctness, not taste.** Body `line-height: 1.8`, `letter-spacing: 0` on all
  Thai text, extra vertical padding on buttons. Test every layout at 360px width.
- **All admin-facing copy is Thai** — labels, buttons, toasts, validation, empty states.
- **Server Actions for every mutation**, with the same Zod schema the form uses. No ad-hoc fetch to
  our own API. `revalidateTag` after writes.
- **Every mutation writes an `audit_log` row** with a field-level diff.
- **Soft delete** on categories, products, posts, media. Check usage before allowing a delete.
- **Sanitize Tiptap JSON server-side.** Never `dangerouslySetInnerHTML` on stored content.
- No `any`, no non-null assertion without a comment justifying it.

## Resource reality

The target VPS is 6 GB RAM / 4 cores / 60 GB disk. A production Next.js build alongside Postgres
will OOM on that box — build images in CI and pull them. Postgres is capped at 1.5 GB, the web
container at 1 GB. Disk is the real constraint: images get converted to AVIF/WebP at three sizes on
upload, originals over the threshold are dropped, and the admin dashboard shows disk usage.

## Working agreement

- Work through the phases in `docs/SPEC.md` §12, one at a time. Run `/phase <n>` to start one.
- **Stop at the end of each phase.** Run the verification for that phase, report what passed and what
  didn't, and wait. Do not roll into the next phase unprompted.
- If a decision isn't covered by SPEC.md or DESIGN.md, ask rather than picking. The `[DECIDE]` and
  §14 items are open on purpose.
- Conventional commits. Every phase ends on a green typecheck, lint, and test run.
- When you learn something durable about this codebase — a gotcha, a convention we settled on —
  append it under "Learned" below rather than leaving it in the conversation.

## Learned

**Phase 0**

- **`next build` copies `.env` into `.next/standalone/.env`,** and the standalone server loads it
  from there. Two consequences. First, a CI image built on a checkout that has a `.env` ships those
  secrets inside the image — §11 builds in CI and pulls on the VPS, so make the CI job assert `.env`
  is absent before `pnpm build`. Second, it makes local fail-fast testing lie: the server picks up
  the baked file even when the variable is unset in the environment. Delete `.env` and rebuild
  before testing env validation.
- **Next catches a throw from `instrumentation.register()`** and keeps the process alive serving
  500s — the container stays "running", so `restart: unless-stopped` never fires and the only
  symptom is a dead site. `src/instrumentation.ts` therefore logs and calls `process.exit(1)`
  instead of letting the error propagate.
- **Tailwind v4 `@theme` is the right home for the DESIGN.md tokens.** Utilities compile to
  `var(--color-*)`, so phase 6 can override the custom properties on `<html>` from `settings.theme`
  and the whole site retunes with no rebuild. Nothing in `globals.css` needs to change for that.
- `eslint-config-next` 15 is still eslintrc-shaped; the flat config goes through `FlatCompat` from
  `@eslint/eslintrc`. Keep `eslint` on 9.x — `eslint-config-next` 15 does not declare support for 10.
- Prettier does not touch `docs/` or any `*.md`. SPEC.md and DESIGN.md are authoritative,
  hand-aligned prose and tables; reflowing them churns the diff and breaks the table columns.
- Pinned exact versions everywhere, no ranges. The box is rebuilt rarely and debugged remotely, so
  a silent minor bump months from now is a bad trade for freshness.

**Phase 1**

- **`settings` uses a `'*'` sentinel for locale, not NULL.** §6 specifies `PK(key, locale)` with
  "locale NULL = applies to all locales", which cannot exist — Postgres forces every primary-key
  column NOT NULL. The sentinel keeps the PK real and lookups a plain equality; a nullable column
  under a unique index would also have let duplicate global rows through, since NULL never equals
  NULL. `GLOBAL_LOCALE` in `src/db/schema/settings.ts` is the only place that spells it.
- **uuid v7 is generated application-side.** PG16 has no `uuidv7()` (PG18 added it) and
  `pg_uuidv7` is not in `postgres:16-alpine`. `primaryId()` in `src/db/schema/shared.ts` is the
  single place that decides, so a future PG upgrade is one edit.
- **Every `*_i18n.locale` is a real FK to `locales.code`.** That is what makes "adding a language is
  a row insert" true rather than aspirational — an unknown locale is rejected by the database.
- **The seed is idempotent by hard-deleting `is_seed` rows first,** not by upserting. Children
  cascade from their parents, so only `posts`, `products` and `categories` need deleting. Verified
  clean across three consecutive runs with identical counts and zero orphans.
- **`locales` rows are deliberately not seed-flagged.** They are configuration, not sample content;
  the admin's "purge seed data" button must never remove the site's languages.
- **No `revisions` table** — SPEC §14 decision 12. `audit_log` is the history.
- Seeded products carry **no media rows**. The sharp pipeline is phase 3, and rows pointing at files
  that do not exist would make the media library lie. It also means the "no photograph yet" empty
  state (docs/DESIGN.md) is exercised from day one, which is the state that will ship longest.
- Local Postgres 16.13 is installed on this box, so phases can be verified without Docker:
  `initdb -D /tmp/pgdata -U cida --auth=trust` then `pg_ctl -D /tmp/pgdata -o '-p 5432 -k /tmp' start`.

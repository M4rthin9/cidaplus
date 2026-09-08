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
  After a container restart the data directory survives but the server does not — check for
  `/tmp/pgdata/base` and only run `pg_ctl start`. Re-running `initdb` would wipe the cluster.

**Phase 2**

- **Auth.js cannot do database sessions with the credentials provider.** `@auth/core` asserts
  "Signing in with credentials only supported if JWT strategy is enabled", so §3's original wording
  was unbuildable. Sessions are JWT; revocation comes from `users.session_version`, compared in
  `requireAdmin()`. Bump it whenever access changes — deactivate, password change, role change.
- **The middleware is not the security boundary.** It runs on the edge runtime where neither
  `@node-rs/argon2` (native) nor the postgres driver can load, so it only proves a cookie parses.
  `requireAdmin()` / `requireOwner()` in `src/lib/auth/session.ts` is authoritative, and every admin
  page and server action must call it. Verified: the middleware bundle contains no argon2, postgres
  or drizzle code.
- **`declare module` silently no-ops when the specifier is unresolvable.** `@auth/core` is a
  transitive dep and pnpm's strict layout does not hoist it, so `declare module "@auth/core/jwt"`
  created a *new* ambient module instead of augmenting the real one — with no error. It is now a
  direct devDependency pinned to the exact version next-auth resolves. Augmenting `next-auth/jwt`
  does nothing: it is a bare re-export of `@auth/core/jwt`.
- **`JWT extends Record<string, unknown>`,** so inside the config's own callback types the augmented
  claims widen back to `unknown`. The `session` callback annotates `token: JWT` explicitly.
- **`Algorithm` from `@node-rs/argon2` is a `const enum`,** which `isolatedModules` forbids
  importing as a value. The numeric member is spelled out and asserted by a test on the
  `$argon2id$` digest prefix.
- **Audit diffs redact `passwordHash`, `password` and `sessionVersion`** but still record that the
  field changed, so a rotation is auditable without the material reaching the table. Verified
  against real Postgres: zero audit rows contain an argon2 string.
- **`writeAudit` takes the executor** so it joins the caller's transaction. An audit row that
  survives a rolled-back mutation is a lie.
- Failed logins for an unknown email still run a real argon2 verify against a decoy digest, so
  response time cannot enumerate accounts.
- Do not use `pkill` in this session — it kills the agent's own shell.

**Phase 3**

- **AVIF encoder effort is the single most expensive number in the pipeline.** Measured here on one
  1600px rendition: effort 4 = 10 978 ms / 117 KB, effort 2 = 1 689 ms / 125 KB, effort 0 = 369 ms /
  200 KB. `AVIF_EFFORT = 2`. Effort 4 costs 6.5x the time for 7% smaller files inside a Server
  Action on a 4-core VPS shared with Postgres.
- **Derive everything from the capped master, never from a full-size intermediate.** Holding an
  uncompressed full-size buffer cost 21s and ~100 MB on the 5906x5906 seal; decoding once into the
  2400px master and deriving from that is 6.7s. `MASTER_MAX_WIDTH` must stay >= the largest
  derivative width or this silently starts upscaling.
- **Next caps Server Action bodies at 1 MB by default,** which silently swallowed every real photo
  upload — §13's 10 MB limit was unreachable. `serverActions.bodySizeLimit` is now 24mb, and the
  upload form refuses an oversized batch client-side, because Next rejects the body before any of
  our code runs so the failure would otherwise be invisible.
- **`sharp.format.avif` is absent; AVIF lives under `sharp.format.heif` with an `avif` alias.**
  Checking the former says AVIF is unsupported when it works fine.
- **sharp reports the focal point as `attentionX` / `attentionY` in source pixels.** `cropOffsetLeft`
  is in output space and negative — it is not the field you want.
- **Split client-safe URL helpers from filesystem code.** `node:path` / `node:crypto` in a module a
  client component imports fails the webpack build. `src/lib/media/urls.ts` is pure and importable
  anywhere; `storage.ts` carries `import "server-only"` so the boundary is enforced. Vitest aliases
  `server-only` to `test/server-only-stub.ts`, since it throws by design outside a Server Component.
- **`output: "standalone"` does not copy `.next/static` or `public/`.** Both must be copied beside
  `server.js` or every asset 404s and the app runs unhydrated. Phase 11's deploy script must do this.
- Testing gotcha: the admin layout's sign-out button precedes page content in the DOM, so a bare
  `button[type="submit"]` selector clicks *sign out*. Scope form clicks, e.g.
  `form:has(#files) button[type="submit"]`.
- Playwright 1.57 expects Chromium build 1200; this image ships 1194 at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Launch with an explicit `executablePath`.
- `/proc/<pid>/comm` truncates to 15 chars, so `next-server (v15.5.25)` reads as `next-server (v1`.
  Match on `/proc/<pid>/cmdline` when hunting a stray dev server — and never `pkill`.

**Phase 4**

- **`z.string().optional().or(z.literal("").transform(() => undefined))` does not turn "" into
  undefined.** The empty string satisfies the *first* branch, so the union never reaches the
  transform and "" is written verbatim — which for a nullable foreign key is a constraint violation,
  not a null. This 500'd category creation. Use `z.preprocess` to strip "" before validation;
  `optionalString()` in `src/lib/validation/catalog.ts` is the one place that does it. `env.ts`
  escapes the bug only because its first branch carries `.min(1)`, so "" fails it.
- **Slugs are Thai UTF-8** (§14 decision 17). `slugify` keeps the Thai block and ASCII
  alphanumerics; U+200B is a *word boundary* in Thai (no spaces between words) so it becomes a
  hyphen, while ZWNJ/ZWJ/BOM are stripped as invisible.
- **A 301 is only written when the entity was already published** — an unpublished draft has no
  public URL to redirect from. `recordSlugRedirect` also re-points existing rows at the new target
  so a rename chain stays one hop, and deletes any row that would redirect to itself.
- **dnd-kit ships English screen-reader announcements that read out raw UUIDs.** Every admin-facing
  string is Thai, and a screen reader is admin-facing, so `DndContext` gets Thai `announcements` and
  `screenReaderInstructions` built from the category names.
- Testing gotcha: dnd-kit keyboard sorting needs a beat between key presses. Space → ArrowDown →
  Space fired back-to-back silently does nothing; ~400ms between them works. Mouse drag needs
  intermediate `mouse.move` steps to clear the 4px activation constraint.
- `products.sort_order` is ordered **within a category**, since products are listed per category.
  New products sort last.
- Server actions called from a client component inside `startTransition` do refresh the RSC payload,
  so `revalidatePath` updates props with no manual reload — verified by a bulk unpublish changing
  the table's state column in place.

